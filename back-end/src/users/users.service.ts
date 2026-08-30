import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto, LoginDto } from './users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll() {
    return this.usersRepository.find();
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password || 'default123', 10);
    const initialStatus = createUserDto.role === 'owner' ? 'pending' : 'active';
    const newUser = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      status: initialStatus,
      joinDate: new Date().toISOString().split('T')[0],
    });
    return this.usersRepository.save(newUser);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    
    // Filter out undefined values to prevent overwriting
    const cleanDto = Object.fromEntries(Object.entries(updateUserDto).filter(([_, v]) => v !== undefined));
    
    if (cleanDto.password) {
      cleanDto.password = await bcrypt.hash(cleanDto.password as string, 10);
    }

    Object.assign(user, cleanDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    const removed = { ...user };
    await this.usersRepository.remove(user);
    return removed;
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersRepository.findOne({ where: { username: loginDto.username } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    const isMatch = await bcrypt.compare(loginDto.password || '', user.password || '');
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');
    
    const { password, ...result } = user;
    return result;
  }
}
