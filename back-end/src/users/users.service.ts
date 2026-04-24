import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { USERS, getNextId } from '../data';
import { CreateUserDto, UpdateUserDto, LoginDto } from './users.dto';

@Injectable()
export class UsersService {
  findAll() {
    return USERS;
  }

  findOne(id: number) {
    const user = USERS.find(u => u.id === id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  create(createUserDto: CreateUserDto) {
    const newUser = {
      id: getNextId('user'),
      ...createUserDto,
      password: createUserDto.password || 'default123',
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      property: null
    };
    USERS.push(newUser);
    return newUser;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    const idx = USERS.findIndex(u => u.id === id);
    if (idx === -1) throw new NotFoundException(`User with ID ${id} not found`);
    USERS[idx] = { ...USERS[idx], ...updateUserDto };
    return USERS[idx];
  }

  remove(id: number) {
    const idx = USERS.findIndex(u => u.id === id);
    if (idx === -1) throw new NotFoundException(`User with ID ${id} not found`);
    return USERS.splice(idx, 1)[0];
  }

  login(loginDto: LoginDto) {
    const user = USERS.find(u => u.username === loginDto.username && u.password === loginDto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    
    // Omit password from response
    const { password, ...result } = user;
    return result;
  }
}
