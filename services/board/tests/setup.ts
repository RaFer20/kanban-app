import { execSync } from 'child_process';

module.exports = async () => {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
};