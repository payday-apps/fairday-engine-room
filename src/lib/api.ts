import axios from 'axios';

// Always point to staging API for the Engine Room
export const api = axios.create({
  baseURL: 'https://staging-api.fairday.app/api/admin/claims',
  withCredentials: true,
});

export const authenticateAdmin = async () => {
  try {
    const res = await axios.post('https://staging-api.fairday.app/internal/admin-token', {}, {
      withCredentials: true
    });
    return res.status === 200;
  } catch (error) {
    return false;
  }
};