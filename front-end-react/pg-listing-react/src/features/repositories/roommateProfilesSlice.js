import { createRepositorySlice } from './createRepositorySlice';

// Repository: roommate_profiles (lifestyle data for roommate matching)
export const roommateProfilesRepo = createRepositorySlice({
  name: 'roommateProfiles',
  base: '/roommate-profiles',
  updateMethod: 'patch',
});
