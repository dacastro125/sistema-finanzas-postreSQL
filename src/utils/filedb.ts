import fs from 'fs';
import path from 'path';

const dataDir = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

export const readData = <T>(fileName: string): T[] => {
    const filePath = path.join(dataDir, fileName);
    if (!fs.existsSync(filePath)) {
        return [];
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
};

export const writeData = <T>(fileName: string, data: T[]): void => {
    const filePath = path.join(dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};
