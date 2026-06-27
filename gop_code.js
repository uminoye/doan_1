const fs = require('fs');
const path = require('path');

// 1. CHỈ định các thư mục rác/biên dịch cần BỎ QUA
const EXCLUDE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', 'uploads', '.vscode', 'public'];

// 2. CHỈ gom các file code có đuôi này (Đây là các ngôn ngữ em đang dùng)
const ALLOW_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.prisma', '.css', '.json', '.md'];

// 3. Bỏ qua các file cấu hình không quan trọng
const EXCLUDE_FILES = ['package-lock.json', 'gop_code.js', 'tsconfig.tsbuildinfo'];

const OUTPUT_FILE = 'tong_hop_code.txt';

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        const fullPath = path.join(dirPath, file);
        
        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            
            // Kiểm tra xem file có thuộc danh sách đuôi cho phép không, hoặc là file .env
            const isAllowedExt = ALLOW_EXTENSIONS.includes(ext) || file.startsWith('.env');
            const isNotExcludedFile = !EXCLUDE_FILES.includes(file);
            
            // Bỏ qua các file sinh tự động của TypeScript (.map, .d.ts)
            const isNotMapOrDts = !file.endsWith('.map') && !file.endsWith('.d.ts');

            if (isAllowedExt && isNotExcludedFile && isNotMapOrDts) {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

function combineCode() {
    console.log('⏳ Đang quét thư mục và gom mã nguồn gốc (TypeScript, Next.js, Prisma)...');
    const allFiles = getAllFiles(__dirname);
    let combinedContent = '';

    allFiles.forEach(filePath => {
        const relativePath = path.relative(__dirname, filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        
        combinedContent += `\n\n=================================================================\n`;
        combinedContent += `FILE: ${relativePath}\n`;
        combinedContent += `=================================================================\n\n`;
        combinedContent += content;
    });

    fs.writeFileSync(OUTPUT_FILE, combinedContent, 'utf8');
    console.log(`✅ Gom code thành công! Đã tạo ra file siêu sạch: ${OUTPUT_FILE}`);
}

combineCode();