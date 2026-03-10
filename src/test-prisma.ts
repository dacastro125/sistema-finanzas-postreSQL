import { prisma } from './utils/prisma';

async function test() {
    try {
        console.log('Connecting to Prisma...');
        const users = await prisma.user.findMany();
        console.log('Users:', users);
        console.log('Prisma is working!');
    } catch (error) {
        console.error('Prisma Error:', error);
    }
}

test();
