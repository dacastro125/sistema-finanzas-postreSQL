import { prisma } from './src/utils/prisma';

const extras = [
    { name: 'Gasolina', type: 'expense', color: '#607D8B' },
    { name: '4x1000', type: 'expense', color: '#795548' },
    { name: 'Otros', type: 'expense', color: '#9E9E9E' }
];

async function run() {
    try {
        console.log("Iniciando inyección retroactiva global...");
        
        // Obtener la ID de absolutamente todos los usuarios.
        const users = await prisma.user.findMany({ select: { id: true } });
        console.log(`Buscando a ${users.length} usuario(s) en la base de datos...`);

        let inyectadas = 0;

        for (const user of users) {
             // Averiguar si el usuario ya tiene la categoría de "Gasolina" (como indicativo de que ya fue parcheado)
             const check = await prisma.category.findFirst({
                 where: { userId: user.id, name: 'Gasolina' }
             });

             if (!check) {
                 // Si no la tiene, se inyectan las 3 exclusivas para él
                 const dataToInsert = extras.map(c => ({
                     userId: user.id,
                     name: c.name,
                     type: c.type,
                     color: c.color
                 }));
                 
                 await prisma.category.createMany({ data: dataToInsert });
                 inyectadas++;
             }
        }

        console.log(`Proceso terminado. Se inyectaron exitosamente categorías a ${inyectadas} usuario(s) antiguos.`);
    } catch (e) {
        console.error("Error crítico durante la inyección:", e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
