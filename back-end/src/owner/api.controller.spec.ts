import { ApiController } from './api.controller';

describe('owner API property access', () => {
  const properties = {
    findOne: jest.fn().mockResolvedValue({ id: 9, ownerId: 42 }),
    update: jest.fn().mockResolvedValue({ id: 9, ownerId: 42 }),
  };
  const controller = new ApiController(properties as any, {} as any, {} as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('allows an owner to update their own property', async () => {
    await expect(controller.updateProperty('9', { name: 'Updated' }, '42'))
      .resolves.toEqual({ id: 9, ownerId: 42 });
    expect(properties.update).toHaveBeenCalledWith(9, { name: 'Updated' });
  });

  it('rejects an update to another owner’s property', async () => {
    await expect(controller.updateProperty('9', { name: 'Updated' }, '43'))
      .rejects.toThrow('Property does not belong to this owner');
    expect(properties.update).not.toHaveBeenCalled();
  });
});
