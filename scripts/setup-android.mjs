import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidResDir = path.join(root, 'android', 'app', 'src', 'main', 'res');
const manifestPath = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error('Error: No se encontró android/app/src/main/AndroidManifest.xml.');
  console.error('Ejecuta primero: npx cap add android');
  process.exit(1);
}

// 1. Inyectar permisos necesarios para alarmas exactas y notificaciones offline en Bigme / Android 13-14+
let manifest = fs.readFileSync(manifestPath, 'utf8');
const requiredPermissions = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.WAKE_LOCK',
  'android.permission.VIBRATE'
];

const missingLines = requiredPermissions
  .filter((perm) => !manifest.includes(perm))
  .map((perm) => `    <uses-permission android:name="${perm}" />`);

if (missingLines.length > 0) {
  manifest = manifest.replace(
    '<application',
    `${missingLines.join('\n')}\n\n    <application`
  );
  fs.writeFileSync(manifestPath, manifest, 'utf8');
  console.log(`Permisos añadidos a AndroidManifest.xml (${missingLines.length}).`);
} else {
  console.log('AndroidManifest.xml ya contiene todos los permisos necesarios.');
}

// 2. Copiar el icono oficial E-Ink de Tinta a las carpetas mipmap de Android
const icon192 = path.join(root, 'public', 'pwa-192x192.png');
const icon512 = path.join(root, 'public', 'pwa-512x512.png');

if (fs.existsSync(icon192) && fs.existsSync(icon512) && fs.existsSync(androidResDir)) {
  const anydpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
  if (fs.existsSync(anydpiDir)) {
    fs.rmSync(anydpiDir, { recursive: true, force: true });
  }

  const densities = [
    { dir: 'mipmap-mdpi', src: icon192 },
    { dir: 'mipmap-hdpi', src: icon192 },
    { dir: 'mipmap-xhdpi', src: icon192 },
    { dir: 'mipmap-xxhdpi', src: icon512 },
    { dir: 'mipmap-xxxhdpi', src: icon512 }
  ];

  for (const { dir, src } of densities) {
    const targetDir = path.join(androidResDir, dir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(src, path.join(targetDir, 'ic_launcher.png'));
    fs.copyFileSync(src, path.join(targetDir, 'ic_launcher_round.png'));
  }
  console.log('Iconos de Tinta E-Ink instalados en Android mipmap-*.');
}
