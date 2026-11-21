import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const androidMainDir = path.join(root, 'android', 'app', 'src', 'main');
const androidResDir = path.join(androidMainDir, 'res');
const javaPkgDir = path.join(androidMainDir, 'java', 'com', 'tinta', 'eink');
const manifestPath = path.join(androidMainDir, 'AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.error('Error: No se encontró android/app/src/main/AndroidManifest.xml.');
  console.error('Ejecuta primero: npx cap add android');
  process.exit(1);
}

function writeFileEnsureDir(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Inyectar permisos y receptores de Widgets en AndroidManifest.xml
let manifest = fs.readFileSync(manifestPath, 'utf8');
const requiredPermissions = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.WAKE_LOCK',
  'android.permission.VIBRATE',
  'android.permission.RECORD_AUDIO'
];

const missingPerms = requiredPermissions
  .filter((perm) => !manifest.includes(perm))
  .map((perm) => `    <uses-permission android:name="${perm}" />`);

if (missingPerms.length > 0) {
  manifest = manifest.replace(
    '<application',
    `${missingPerms.join('\n')}\n\n    <application`
  );
}

if (!manifest.includes('TintaCaptureWidgetProvider')) {
  const widgetReceivers = `
        <receiver
            android:name=".TintaCaptureWidgetProvider"
            android:exported="true"
            android:label="@string/widget_capture_name">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/tinta_capture_widget_info" />
        </receiver>

        <receiver
            android:name=".TintaTaskWidgetProvider"
            android:exported="true"
            android:label="@string/widget_task_name">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="com.tinta.eink.ACTION_COMPLETE_CURRENT" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/tinta_task_widget_info" />
        </receiver>

        <receiver
            android:name=".TintaCalendarWidgetProvider"
            android:exported="true"
            android:label="@string/widget_calendar_name">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="android.intent.action.DATE_CHANGED" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/tinta_calendar_widget_info" />
        </receiver>
    </application>`;

  manifest = manifest.replace('</application>', widgetReceivers);
}

fs.writeFileSync(manifestPath, manifest, 'utf8');
console.log('AndroidManifest.xml actualizado con permisos de voz, alarmas y widgets.');

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

// 3. Recursos XML para Widgets E-Ink Kaleido 3 con esquinas redondeadas
writeFileEnsureDir(
  path.join(androidResDir, 'values', 'widget_strings.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_capture_name">Tinta · Captura rápida</string>
    <string name="widget_capture_desc">Crea recordatorios por teclado o voz desde tu pantalla principal.</string>
    <string name="widget_task_name">Tinta · Tarea actual</string>
    <string name="widget_task_desc">Muestra tu recordatorio prioritario actual y permite completarlo en un toque.</string>
    <string name="widget_calendar_name">Tinta · Calendario</string>
    <string name="widget_calendar_desc">Mes actual con círculo rojo en hoy, días con recordatorios y barra del evento de la hora.</string>
</resources>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_card_bg.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke android:width="2.5dp" android:color="#000000" />
    <corners android:radius="18dp" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_btn_outline.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke android:width="2dp" android:color="#000000" />
    <corners android:radius="12dp" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_btn_dark.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#000000" />
    <corners android:radius="12dp" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_count_pill.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke android:width="1.8dp" android:color="#000000" />
    <corners android:radius="9dp" />
</shape>
`
);

const pillColors = {
  widget_pill_morning: '#D95F00',
  widget_pill_afternoon: '#0044CC',
  widget_pill_inbox: '#000000',
  widget_pill_urgent: '#CC0000',
  widget_pill_saturno: '#6A0DAD',
  widget_pill_musica: '#007A33'
};

for (const [name, hex] of Object.entries(pillColors)) {
  writeFileEnsureDir(
    path.join(androidResDir, 'drawable', `${name}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${hex}" />
    <corners android:radius="10dp" />
</shape>
`
  );
}

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_day_clear.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#00000000" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_day_today_circle.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#CC0000" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_day_dot.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#CC0000" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_day_dot_dark.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#000000" />
</shape>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'widget_event_bar.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" />
    <stroke android:width="2dp" android:color="#000000" />
    <corners android:radius="11dp" />
</shape>
`
);

const chipColors = {
  widget_time_chip_red: '#CC0000',
  widget_time_chip_amber: '#D95F00',
  widget_time_chip_blue: '#0044CC',
  widget_time_chip_dark: '#000000'
};

for (const [name, hex] of Object.entries(chipColors)) {
  writeFileEnsureDir(
    path.join(androidResDir, 'drawable', `${name}.xml`),
    `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${hex}" />
    <corners android:radius="7dp" />
</shape>
`
  );
}

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'ic_widget_plus.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#000000"
        android:pathData="M11,4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
</vector>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'ic_widget_mic.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,2.5c1.66,0 3,1.34 3,3v4.5c0,1.66 -1.34,3 -3,3s-3,-1.34 -3,-3V5.5c0,-1.66 1.34,-3 3,-3z" />
    <path
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFF"
        android:strokeWidth="2.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M5,10.5a7,7 0 0,0 14,0" />
    <path
        android:fillColor="#00000000"
        android:strokeColor="#FFFFFF"
        android:strokeWidth="2.5"
        android:strokeLineCap="round"
        android:pathData="M12,17.5L12,21M8.5,21L15.5,21" />
</vector>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'drawable', 'ic_widget_check.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M9,16.17L4.83,12l-1.42,1.41L9,19 21,7l-1.41,-1.41z" />
</vector>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'layout', 'widget_capture.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_card_bg"
    android:gravity="center_vertical"
    android:orientation="horizontal"
    android:padding="10dp">

    <LinearLayout
        android:id="@+id/widget_capture_type_btn"
        android:layout_width="0dp"
        android:layout_height="44dp"
        android:layout_weight="1"
        android:background="@drawable/widget_btn_outline"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingStart="12dp"
        android:paddingEnd="10dp">

        <ImageView
            android:layout_width="18dp"
            android:layout_height="18dp"
            android:contentDescription="Nuevo"
            android:src="@drawable/ic_widget_plus" />

        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="8dp"
            android:layout_weight="1"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Nuevo recordatorio..."
            android:textColor="#000000"
            android:textSize="13.5sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_capture_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="6dp"
            android:background="@drawable/widget_count_pill"
            android:paddingStart="7dp"
            android:paddingTop="2dp"
            android:paddingEnd="7dp"
            android:paddingBottom="2dp"
            android:text="0"
            android:textColor="#000000"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <View
        android:layout_width="8dp"
        android:layout_height="1dp" />

    <LinearLayout
        android:id="@+id/widget_capture_voice_btn"
        android:layout_width="46dp"
        android:layout_height="44dp"
        android:background="@drawable/widget_btn_dark"
        android:gravity="center"
        android:orientation="horizontal">

        <ImageView
            android:layout_width="22dp"
            android:layout_height="22dp"
            android:contentDescription="Dictar por voz"
            android:src="@drawable/ic_widget_mic" />
    </LinearLayout>
</LinearLayout>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'layout', 'widget_task.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_task_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_card_bg"
    android:orientation="vertical"
    android:padding="12dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/widget_task_badge"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:background="@drawable/widget_pill_inbox"
            android:ellipsize="end"
            android:maxLines="1"
            android:paddingStart="9dp"
            android:paddingTop="3dp"
            android:paddingEnd="9dp"
            android:paddingBottom="3dp"
            android:text="TINTA"
            android:textColor="#FFFFFF"
            android:textSize="11sp"
            android:textStyle="bold" />

        <View
            android:layout_width="0dp"
            android:layout_height="1dp"
            android:layout_weight="1" />

        <TextView
            android:id="@+id/widget_task_queue"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginEnd="8dp"
            android:text="0 activas"
            android:textColor="#000000"
            android:textSize="11.5sp"
            android:textStyle="bold" />

        <LinearLayout
            android:id="@+id/widget_task_add_btn"
            android:layout_width="32dp"
            android:layout_height="32dp"
            android:background="@drawable/widget_btn_outline"
            android:gravity="center">

            <ImageView
                android:layout_width="16dp"
                android:layout_height="16dp"
                android:contentDescription="Añadir"
                android:src="@drawable/ic_widget_plus" />
        </LinearLayout>
    </LinearLayout>

    <LinearLayout
        android:id="@+id/widget_task_body"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:gravity="center_vertical"
        android:orientation="vertical"
        android:paddingTop="6dp"
        android:paddingBottom="6dp">

        <TextView
            android:id="@+id/widget_task_title"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:ellipsize="end"
            android:maxLines="2"
            android:text="Todo al día"
            android:textColor="#000000"
            android:textSize="17sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_task_meta"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="3dp"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Toca + para añadir un recordatorio"
            android:textColor="#000000"
            android:textSize="12sp"
            android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:id="@+id/widget_task_hint"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Toca la tarjeta para abrir Tinta"
            android:textColor="#000000"
            android:textSize="11sp" />

        <LinearLayout
            android:id="@+id/widget_task_done_btn"
            android:layout_width="wrap_content"
            android:layout_height="36dp"
            android:background="@drawable/widget_btn_dark"
            android:gravity="center"
            android:orientation="horizontal"
            android:paddingStart="12dp"
            android:paddingEnd="12dp">

            <ImageView
                android:layout_width="15dp"
                android:layout_height="15dp"
                android:contentDescription="Completar"
                android:src="@drawable/ic_widget_check" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginStart="5dp"
                android:text="Hecho"
                android:textColor="#FFFFFF"
                android:textSize="12.5sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'xml', 'tinta_capture_widget_info.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_capture_desc"
    android:initialLayout="@layout/widget_capture"
    android:minWidth="250dp"
    android:minHeight="56dp"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4"
    android:targetCellHeight="1"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'xml', 'tinta_task_widget_info.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_task_desc"
    android:initialLayout="@layout/widget_task"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />
`
);

const calRowsXml = Array.from({ length: 6 }, (_, row) => {
  const cellsXml = Array.from({ length: 7 }, (_, col) => {
    const idx = row * 7 + col;
    return `        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:gravity="center"
            android:orientation="vertical"
            android:paddingTop="1dp"
            android:paddingBottom="1dp">

            <TextView
                android:id="@+id/cal_d_${idx}"
                android:layout_width="22dp"
                android:layout_height="22dp"
                android:background="@drawable/widget_day_clear"
                android:gravity="center"
                android:includeFontPadding="false"
                android:text=""
                android:textColor="#000000"
                android:textSize="11.5sp"
                android:textStyle="bold" />

            <ImageView
                android:id="@+id/cal_dot_${idx}"
                android:layout_width="4dp"
                android:layout_height="4dp"
                android:layout_marginTop="1dp"
                android:contentDescription=""
                android:src="@drawable/widget_day_dot_dark"
                android:visibility="invisible" />
        </LinearLayout>`;
  }).join('\n');

  return `    <LinearLayout
        android:id="@+id/cal_row_${row}"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:gravity="center_vertical"
        android:orientation="horizontal">
${cellsXml}
    </LinearLayout>`;
}).join('\n\n');

const weekdayHeadersXml = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  .map(
    (letter) => `        <TextView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:gravity="center"
            android:text="${letter}"
            android:textColor="#000000"
            android:textSize="11sp"
            android:textStyle="bold" />`
  )
  .join('\n');

writeFileEnsureDir(
  path.join(androidResDir, 'layout', 'widget_calendar.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_cal_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_card_bg"
    android:orientation="vertical"
    android:paddingStart="12dp"
    android:paddingTop="10dp"
    android:paddingEnd="12dp"
    android:paddingBottom="9dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingBottom="5dp">

        <TextView
            android:id="@+id/widget_cal_month"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Calendario"
            android:textColor="#000000"
            android:textSize="14sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_cal_today_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginEnd="6dp"
            android:background="@drawable/widget_count_pill"
            android:paddingStart="7dp"
            android:paddingTop="1dp"
            android:paddingEnd="7dp"
            android:paddingBottom="1dp"
            android:text="0 hoy"
            android:textColor="#000000"
            android:textSize="10.5sp"
            android:textStyle="bold" />

        <LinearLayout
            android:id="@+id/widget_cal_add_btn"
            android:layout_width="26dp"
            android:layout_height="26dp"
            android:background="@drawable/widget_btn_outline"
            android:gravity="center">

            <ImageView
                android:layout_width="13dp"
                android:layout_height="13dp"
                android:contentDescription="Añadir"
                android:src="@drawable/ic_widget_plus" />
        </LinearLayout>
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:paddingTop="1dp"
        android:paddingBottom="4dp">
${weekdayHeadersXml}
    </LinearLayout>

    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginBottom="3dp"
        android:background="#000000" />

    <LinearLayout
        android:id="@+id/widget_cal_grid"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical">
${calRowsXml}
    </LinearLayout>

    <View
        android:layout_width="match_parent"
        android:layout_height="1dp"
        android:layout_marginTop="4dp"
        android:background="#000000" />

    <LinearLayout
        android:id="@+id/widget_cal_event_bar"
        android:layout_width="match_parent"
        android:layout_height="30dp"
        android:layout_marginTop="5dp"
        android:gravity="center_vertical"
        android:orientation="horizontal"
        android:paddingStart="2dp"
        android:paddingEnd="2dp">

        <TextView
            android:id="@+id/widget_cal_event_time"
            android:layout_width="wrap_content"
            android:layout_height="21dp"
            android:background="@drawable/widget_time_chip_red"
            android:gravity="center"
            android:includeFontPadding="false"
            android:paddingStart="7dp"
            android:paddingEnd="7dp"
            android:text="AHORA"
            android:textColor="#FFFFFF"
            android:textSize="10.5sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_cal_event_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_marginStart="7dp"
            android:layout_weight="1"
            android:ellipsize="end"
            android:maxLines="1"
            android:text="Sin eventos esta hora"
            android:textColor="#000000"
            android:textSize="12sp"
            android:textStyle="bold" />

        <TextView
            android:id="@+id/widget_cal_event_more"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginStart="5dp"
            android:text=""
            android:textColor="#000000"
            android:textSize="10.5sp"
            android:textStyle="bold"
            android:visibility="gone" />
    </LinearLayout>
</LinearLayout>
`
);

writeFileEnsureDir(
  path.join(androidResDir, 'xml', 'tinta_calendar_widget_info.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/widget_calendar_desc"
    android:initialLayout="@layout/widget_calendar"
    android:minWidth="250dp"
    android:minHeight="200dp"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4"
    android:targetCellHeight="3"
    android:updatePeriodMillis="1800000"
    android:widgetCategory="home_screen" />
`
);

// 4. Clases Java nativas: MainActivity, TintaNativePlugin, TintaWidgetUpdater y los 2 WidgetProviders
writeFileEnsureDir(
  path.join(javaPkgDir, 'MainActivity.java'),
  `package com.tinta.eink;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TintaNativePlugin.class);
        super.onCreate(savedInstanceState);
        handleWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("tinta_action");
        if ("quick_type".equals(action) || "quick_voice".equals(action)) {
            TintaNativePlugin.setPendingLaunchAction(this, action);
            intent.removeExtra("tinta_action");
            if (getBridge() != null) {
                getBridge().triggerWindowJSEvent("tintaWidgetAction", "{\\"action\\":\\"" + action + "\\"}");
            }
        }
    }
}
`
);

writeFileEnsureDir(
  path.join(javaPkgDir, 'TintaNativePlugin.java'),
  `package com.tinta.eink;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "TintaNative")
public class TintaNativePlugin extends Plugin {
    public static final String PREFS_NAME = "tinta_widget_prefs";
    public static final String KEY_TASKS_JSON = "tasks_json";
    public static final String KEY_ACTIVE_COUNT = "active_count";
    public static final String KEY_PENDING_COMPLETIONS = "pending_completions";
    public static final String KEY_PENDING_ACTION = "pending_launch_action";

    public static void setPendingLaunchAction(Context context, String action) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_PENDING_ACTION, action).apply();
    }

    @PluginMethod
    public void startVoiceInput(PluginCall call) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES");
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Di tu recordatorio (ej: Saturno revisar 17:30)");
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);

        try {
            startActivityForResult(call, intent, "handleVoiceResult");
        } catch (ActivityNotFoundException ex) {
            JSObject ret = new JSObject();
            ret.put("unavailable", true);
            ret.put("text", "");
            call.resolve(ret);
        }
    }

    @ActivityCallback
    private void handleVoiceResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        JSObject ret = new JSObject();
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            String spoken = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
            ret.put("text", spoken != null ? spoken : "");
            ret.put("cancelled", false);
        } else {
            ret.put("text", "");
            ret.put("cancelled", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void syncWidgetState(PluginCall call) {
        String tasksJson = call.getString("tasksJson", "[]");
        Integer countObj = call.getInt("activeCount", 0);
        int activeCount = countObj != null ? countObj : 0;

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString(KEY_TASKS_JSON, tasksJson)
            .putInt(KEY_ACTIVE_COUNT, activeCount)
            .apply();

        TintaWidgetUpdater.updateAllWidgets(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePendingCompletions(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_PENDING_COMPLETIONS, "[]");
        prefs.edit().remove(KEY_PENDING_COMPLETIONS).apply();

        JSObject ret = new JSObject();
        JSArray out = new JSArray();
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null) {
                    JSObject obj = new JSObject();
                    obj.put("id", item.optString("id", ""));
                    obj.put("completedAt", item.optLong("completedAt", System.currentTimeMillis()));
                    out.put(obj);
                }
            }
        } catch (Exception ignored) {
        }
        ret.put("completions", out);
        call.resolve(ret);
    }

    @PluginMethod
    public void consumePendingAction(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String action = prefs.getString(KEY_PENDING_ACTION, "");
        prefs.edit().remove(KEY_PENDING_ACTION).apply();
        JSObject ret = new JSObject();
        ret.put("action", action != null ? action : "");
        call.resolve(ret);
    }
}
`
);

writeFileEnsureDir(
  path.join(javaPkgDir, 'TintaWidgetUpdater.java'),
  `package com.tinta.eink;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

public class TintaWidgetUpdater {
    public static final String ACTION_COMPLETE_CURRENT = "com.tinta.eink.ACTION_COMPLETE_CURRENT";

    private static final String[] MONTH_NAMES_ES = {
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    };

    private static final int[] CAL_ROW_IDS = {
        R.id.cal_row_0, R.id.cal_row_1, R.id.cal_row_2,
        R.id.cal_row_3, R.id.cal_row_4, R.id.cal_row_5
    };

    private static final int[] CAL_DAY_IDS = {
        R.id.cal_d_0, R.id.cal_d_1, R.id.cal_d_2, R.id.cal_d_3, R.id.cal_d_4, R.id.cal_d_5, R.id.cal_d_6,
        R.id.cal_d_7, R.id.cal_d_8, R.id.cal_d_9, R.id.cal_d_10, R.id.cal_d_11, R.id.cal_d_12, R.id.cal_d_13,
        R.id.cal_d_14, R.id.cal_d_15, R.id.cal_d_16, R.id.cal_d_17, R.id.cal_d_18, R.id.cal_d_19, R.id.cal_d_20,
        R.id.cal_d_21, R.id.cal_d_22, R.id.cal_d_23, R.id.cal_d_24, R.id.cal_d_25, R.id.cal_d_26, R.id.cal_d_27,
        R.id.cal_d_28, R.id.cal_d_29, R.id.cal_d_30, R.id.cal_d_31, R.id.cal_d_32, R.id.cal_d_33, R.id.cal_d_34,
        R.id.cal_d_35, R.id.cal_d_36, R.id.cal_d_37, R.id.cal_d_38, R.id.cal_d_39, R.id.cal_d_40, R.id.cal_d_41
    };

    private static final int[] CAL_DOT_IDS = {
        R.id.cal_dot_0, R.id.cal_dot_1, R.id.cal_dot_2, R.id.cal_dot_3, R.id.cal_dot_4, R.id.cal_dot_5, R.id.cal_dot_6,
        R.id.cal_dot_7, R.id.cal_dot_8, R.id.cal_dot_9, R.id.cal_dot_10, R.id.cal_dot_11, R.id.cal_dot_12, R.id.cal_dot_13,
        R.id.cal_dot_14, R.id.cal_dot_15, R.id.cal_dot_16, R.id.cal_dot_17, R.id.cal_dot_18, R.id.cal_dot_19, R.id.cal_dot_20,
        R.id.cal_dot_21, R.id.cal_dot_22, R.id.cal_dot_23, R.id.cal_dot_24, R.id.cal_dot_25, R.id.cal_dot_26, R.id.cal_dot_27,
        R.id.cal_dot_28, R.id.cal_dot_29, R.id.cal_dot_30, R.id.cal_dot_31, R.id.cal_dot_32, R.id.cal_dot_33, R.id.cal_dot_34,
        R.id.cal_dot_35, R.id.cal_dot_36, R.id.cal_dot_37, R.id.cal_dot_38, R.id.cal_dot_39, R.id.cal_dot_40, R.id.cal_dot_41
    };

    private static int immutableFlag() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static PendingIntent createAppLaunchIntent(Context context, String actionExtra, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (actionExtra != null && !actionExtra.isEmpty()) {
            intent.putExtra("tinta_action", actionExtra);
        }
        return PendingIntent.getActivity(context, requestCode, intent, immutableFlag());
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] captureIds = manager.getAppWidgetIds(new ComponentName(context, TintaCaptureWidgetProvider.class));
        if (captureIds != null && captureIds.length > 0) {
            updateCaptureWidgets(context, manager, captureIds);
        }
        int[] taskIds = manager.getAppWidgetIds(new ComponentName(context, TintaTaskWidgetProvider.class));
        if (taskIds != null && taskIds.length > 0) {
            updateTaskWidgets(context, manager, taskIds);
        }
        int[] calIds = manager.getAppWidgetIds(new ComponentName(context, TintaCalendarWidgetProvider.class));
        if (calIds != null && calIds.length > 0) {
            updateCalendarWidgets(context, manager, calIds);
        }
    }

    public static void updateCaptureWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(TintaNativePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        int activeCount = prefs.getInt(TintaNativePlugin.KEY_ACTIVE_COUNT, 0);

        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_capture);
            views.setTextViewText(R.id.widget_capture_count, String.valueOf(activeCount));
            views.setOnClickPendingIntent(
                R.id.widget_capture_type_btn,
                createAppLaunchIntent(context, "quick_type", 101)
            );
            views.setOnClickPendingIntent(
                R.id.widget_capture_voice_btn,
                createAppLaunchIntent(context, "quick_voice", 102)
            );
            manager.updateAppWidget(widgetId, views);
        }
    }

    public static void updateTaskWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(TintaNativePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String tasksRaw = prefs.getString(TintaNativePlugin.KEY_TASKS_JSON, "[]");
        int activeCount = prefs.getInt(TintaNativePlugin.KEY_ACTIVE_COUNT, 0);

        JSONObject current = null;
        try {
            JSONArray arr = new JSONArray(tasksRaw);
            if (arr.length() > 0) {
                current = arr.optJSONObject(0);
            }
        } catch (Exception ignored) {
        }

        Intent completeIntent = new Intent(context, TintaTaskWidgetProvider.class);
        completeIntent.setAction(ACTION_COMPLETE_CURRENT);
        PendingIntent completePending = PendingIntent.getBroadcast(context, 203, completeIntent, immutableFlag());

        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task);
            views.setOnClickPendingIntent(R.id.widget_task_body, createAppLaunchIntent(context, "", 201));
            views.setOnClickPendingIntent(R.id.widget_task_add_btn, createAppLaunchIntent(context, "quick_type", 202));
            views.setOnClickPendingIntent(R.id.widget_task_done_btn, completePending);

            String queueLabel = activeCount == 1 ? "1 activa" : activeCount + " activas";
            views.setTextViewText(R.id.widget_task_queue, queueLabel);

            if (current == null) {
                views.setInt(R.id.widget_task_badge, "setBackgroundResource", R.drawable.widget_pill_inbox);
                views.setTextViewText(R.id.widget_task_badge, "TINTA · AL DÍA");
                views.setTextViewText(R.id.widget_task_title, "Todo al día");
                views.setTextViewText(R.id.widget_task_meta, "Sin recordatorios pendientes");
                views.setTextViewText(R.id.widget_task_hint, "Toca + para crear uno nuevo");
                views.setViewVisibility(R.id.widget_task_done_btn, View.GONE);
            } else {
                String title = current.optString("title", "Recordatorio");
                String section = current.optString("section", "inbox");
                String dueTime = current.optString("dueTime", "");
                String category = current.optString("category", "otros");
                boolean priority = current.optBoolean("priority", false);

                String secLabel = "morning".equals(section) ? "MAÑANA" : "afternoon".equals(section) ? "TARDE" : "PENDIENTES";
                String badgeText = dueTime.isEmpty() ? secLabel : secLabel + " · " + dueTime;

                int badgeBg = R.drawable.widget_pill_inbox;
                if (priority || "trabajo".equals(category)) {
                    badgeBg = R.drawable.widget_pill_urgent;
                } else if ("saturno".equals(category)) {
                    badgeBg = R.drawable.widget_pill_saturno;
                } else if ("musica".equals(category)) {
                    badgeBg = R.drawable.widget_pill_musica;
                } else if ("personal".equals(category)) {
                    badgeBg = R.drawable.widget_pill_afternoon;
                } else if ("morning".equals(section)) {
                    badgeBg = R.drawable.widget_pill_morning;
                } else if ("afternoon".equals(section)) {
                    badgeBg = R.drawable.widget_pill_afternoon;
                }

                StringBuilder meta = new StringBuilder();
                if (priority) meta.append("! Urgente");
                if (!category.isEmpty() && !"none".equals(category)) {
                    if (meta.length() > 0) meta.append(" · ");
                    String catDisplay = "musica".equals(category)
                        ? "Música"
                        : Character.toUpperCase(category.charAt(0)) + category.substring(1);
                    meta.append(catDisplay);
                }
                int remaining = Math.max(0, activeCount - 1);
                if (remaining > 0) {
                    if (meta.length() > 0) meta.append(" · ");
                    meta.append("+").append(remaining).append(" más");
                }
                if (meta.length() == 0) {
                    meta.append("Toca la tarjeta para editar");
                }

                views.setInt(R.id.widget_task_badge, "setBackgroundResource", badgeBg);
                views.setTextViewText(R.id.widget_task_badge, badgeText);
                views.setTextViewText(R.id.widget_task_title, title);
                views.setTextViewText(R.id.widget_task_meta, meta.toString());
                views.setTextViewText(R.id.widget_task_hint, "Pulsa Hecho para pasar al siguiente");
                views.setViewVisibility(R.id.widget_task_done_btn, View.VISIBLE);
            }

            manager.updateAppWidget(widgetId, views);
        }
    }

    private static int parseTimeToMinutes(String hhmm) {
        if (hhmm == null || hhmm.length() < 4 || !hhmm.contains(":")) return -1;
        try {
            String[] parts = hhmm.split(":");
            int h = Integer.parseInt(parts[0].trim());
            int m = Integer.parseInt(parts[1].trim());
            if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
            return h * 60 + m;
        } catch (Exception ignored) {
            return -1;
        }
    }

    public static void updateCalendarWidgets(Context context, AppWidgetManager manager, int[] widgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(TintaNativePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String tasksRaw = prefs.getString(TintaNativePlugin.KEY_TASKS_JSON, "[]");

        Calendar now = Calendar.getInstance();
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH); // 0..11
        int todayDay = now.get(Calendar.DAY_OF_MONTH);
        int nowHour = now.get(Calendar.HOUR_OF_DAY);
        int nowMinute = now.get(Calendar.MINUTE);
        int nowMins = nowHour * 60 + nowMinute;
        String todayStr = String.format(Locale.ROOT, "%04d-%02d-%02d", year, month + 1, todayDay);

        Set<String> datesWithTasks = new HashSet<>();
        Set<String> urgentDates = new HashSet<>();

        int todayCount = 0;
        JSONObject currentHourTask = null;
        int currentHourDiff = Integer.MAX_VALUE;
        JSONObject nextUpcomingTask = null;
        int nextUpcomingMins = Integer.MAX_VALUE;
        JSONObject latestOverdueTask = null;
        int latestOverdueMins = -1;
        JSONObject fallbackTodayTask = null;

        try {
            JSONArray arr = new JSONArray(tasksRaw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item == null) continue;
                String dueDate = item.optString("dueDate", "");
                String dueTime = item.optString("dueTime", "");
                String section = item.optString("section", "inbox");
                boolean priority = item.optBoolean("priority", false);

                if (!dueDate.isEmpty()) {
                    datesWithTasks.add(dueDate);
                    if (priority || dueDate.compareTo(todayStr) < 0) {
                        urgentDates.add(dueDate);
                    }
                } else if (!"inbox".equals(section) || !dueTime.isEmpty()) {
                    datesWithTasks.add(todayStr);
                    if (priority) urgentDates.add(todayStr);
                }

                boolean isPastOrToday = dueDate.isEmpty() || dueDate.compareTo(todayStr) <= 0;
                if (!isPastOrToday) continue;

                todayCount++;
                boolean isTodayTask = dueDate.isEmpty() || todayStr.equals(dueDate);
                int tMins = parseTimeToMinutes(dueTime);

                if (isTodayTask && tMins >= 0) {
                    int diff = Math.abs(tMins - nowMins);
                    if (diff <= 59 && diff < currentHourDiff) {
                        currentHourDiff = diff;
                        currentHourTask = item;
                    }
                    if (tMins >= nowMins && tMins < nextUpcomingMins) {
                        nextUpcomingMins = tMins;
                        nextUpcomingTask = item;
                    }
                    if (tMins < nowMins && tMins > latestOverdueMins) {
                        latestOverdueMins = tMins;
                        latestOverdueTask = item;
                    }
                }

                if (fallbackTodayTask == null) {
                    fallbackTodayTask = item;
                } else if (isTodayTask) {
                    String wantedSec = nowHour < 14 ? "morning" : "afternoon";
                    if (wantedSec.equals(section) && !wantedSec.equals(fallbackTodayTask.optString("section", ""))) {
                        fallbackTodayTask = item;
                    }
                }
            }
        } catch (Exception ignored) {
        }

        JSONObject chosenEvent = currentHourTask != null
            ? currentHourTask
            : (nextUpcomingTask != null ? nextUpcomingTask : (latestOverdueTask != null ? latestOverdueTask : fallbackTodayTask));

        Calendar firstOfMonth = Calendar.getInstance();
        firstOfMonth.set(year, month, 1, 12, 0, 0);
        int firstDow = firstOfMonth.get(Calendar.DAY_OF_WEEK); // Sun=1, Mon=2..Sat=7
        int offset = (firstDow - Calendar.MONDAY + 7) % 7; // 0=Mon..6=Sun
        int daysInMonth = firstOfMonth.getActualMaximum(Calendar.DAY_OF_MONTH);
        boolean needsSixRows = (offset + daysInMonth) > 35;

        String monthHeader = MONTH_NAMES_ES[month] + " " + year;
        String todayCountLabel = todayCount == 1 ? "1 hoy" : todayCount + " hoy";

        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);
            views.setTextViewText(R.id.widget_cal_month, monthHeader);
            views.setTextViewText(R.id.widget_cal_today_count, todayCountLabel);
            views.setOnClickPendingIntent(R.id.widget_cal_grid, createAppLaunchIntent(context, "", 301));
            views.setOnClickPendingIntent(R.id.widget_cal_event_bar, createAppLaunchIntent(context, "", 302));
            views.setOnClickPendingIntent(R.id.widget_cal_add_btn, createAppLaunchIntent(context, "quick_type", 303));

            views.setViewVisibility(CAL_ROW_IDS[5], needsSixRows ? View.VISIBLE : View.GONE);

            for (int cell = 0; cell < 42; cell++) {
                int dayNum = cell - offset + 1;
                if (dayNum < 1 || dayNum > daysInMonth) {
                    views.setTextViewText(CAL_DAY_IDS[cell], "");
                    views.setInt(CAL_DAY_IDS[cell], "setBackgroundResource", R.drawable.widget_day_clear);
                    views.setViewVisibility(CAL_DOT_IDS[cell], View.INVISIBLE);
                    continue;
                }

                String cellIso = String.format(Locale.ROOT, "%04d-%02d-%02d", year, month + 1, dayNum);
                boolean isToday = (dayNum == todayDay);
                boolean hasTask = datesWithTasks.contains(cellIso);
                boolean isUrgent = isToday || urgentDates.contains(cellIso);

                views.setTextViewText(CAL_DAY_IDS[cell], String.valueOf(dayNum));
                if (isToday) {
                    views.setInt(CAL_DAY_IDS[cell], "setBackgroundResource", R.drawable.widget_day_today_circle);
                    views.setTextColor(CAL_DAY_IDS[cell], Color.WHITE);
                } else {
                    views.setInt(CAL_DAY_IDS[cell], "setBackgroundResource", R.drawable.widget_day_clear);
                    views.setTextColor(CAL_DAY_IDS[cell], Color.parseColor("#000000"));
                }

                if (hasTask) {
                    views.setImageViewResource(
                        CAL_DOT_IDS[cell],
                        isUrgent ? R.drawable.widget_day_dot : R.drawable.widget_day_dot_dark
                    );
                    views.setViewVisibility(CAL_DOT_IDS[cell], View.VISIBLE);
                } else {
                    views.setViewVisibility(CAL_DOT_IDS[cell], View.INVISIBLE);
                }
            }

            if (chosenEvent == null) {
                String clockNow = String.format(Locale.ROOT, "%02d:%02d", nowHour, nowMinute);
                views.setInt(R.id.widget_cal_event_time, "setBackgroundResource", R.drawable.widget_time_chip_dark);
                views.setTextViewText(R.id.widget_cal_event_time, clockNow);
                views.setTextViewText(R.id.widget_cal_event_title, "Sin eventos esta hora");
                views.setViewVisibility(R.id.widget_cal_event_more, View.GONE);
            } else {
                String evTitle = chosenEvent.optString("title", "Recordatorio");
                String evTime = chosenEvent.optString("dueTime", "");
                String evDate = chosenEvent.optString("dueDate", "");
                String evSection = chosenEvent.optString("section", "inbox");
                boolean evPriority = chosenEvent.optBoolean("priority", false);
                int evMins = parseTimeToMinutes(evTime);

                String chipLabel;
                int chipBg;
                if (!evTime.isEmpty()) {
                    chipLabel = evTime;
                    boolean isRightNow = (evMins >= 0 && Math.abs(evMins - nowMins) <= 59);
                    boolean isPast = (!evDate.isEmpty() && evDate.compareTo(todayStr) < 0) || (evMins >= 0 && evMins < nowMins);
                    if (isRightNow || isPast || evPriority) {
                        chipBg = R.drawable.widget_time_chip_red;
                    } else if (evMins < 14 * 60) {
                        chipBg = R.drawable.widget_time_chip_amber;
                    } else {
                        chipBg = R.drawable.widget_time_chip_blue;
                    }
                } else if ("morning".equals(evSection)) {
                    chipLabel = "MAÑ.";
                    chipBg = R.drawable.widget_time_chip_amber;
                } else if ("afternoon".equals(evSection)) {
                    chipLabel = "TARDE";
                    chipBg = R.drawable.widget_time_chip_blue;
                } else {
                    chipLabel = "PEND.";
                    chipBg = evPriority ? R.drawable.widget_time_chip_red : R.drawable.widget_time_chip_dark;
                }

                views.setInt(R.id.widget_cal_event_time, "setBackgroundResource", chipBg);
                views.setTextViewText(R.id.widget_cal_event_time, chipLabel);
                views.setTextViewText(R.id.widget_cal_event_title, (evPriority ? "! " : "") + evTitle);

                int extraCount = Math.max(0, todayCount - 1);
                if (extraCount > 0) {
                    views.setTextViewText(R.id.widget_cal_event_more, "+" + extraCount);
                    views.setViewVisibility(R.id.widget_cal_event_more, View.VISIBLE);
                } else {
                    views.setViewVisibility(R.id.widget_cal_event_more, View.GONE);
                }
            }

            manager.updateAppWidget(widgetId, views);
        }
    }
}
`
);

writeFileEnsureDir(
  path.join(javaPkgDir, 'TintaCaptureWidgetProvider.java'),
  `package com.tinta.eink;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class TintaCaptureWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        TintaWidgetUpdater.updateCaptureWidgets(context, appWidgetManager, appWidgetIds);
    }
}
`
);

writeFileEnsureDir(
  path.join(javaPkgDir, 'TintaTaskWidgetProvider.java'),
  `package com.tinta.eink;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

public class TintaTaskWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        TintaWidgetUpdater.updateTaskWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent != null && TintaWidgetUpdater.ACTION_COMPLETE_CURRENT.equals(intent.getAction())) {
            completeTopTaskFromWidget(context);
        }
    }

    private void completeTopTaskFromWidget(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(TintaNativePlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String tasksRaw = prefs.getString(TintaNativePlugin.KEY_TASKS_JSON, "[]");
        String pendingRaw = prefs.getString(TintaNativePlugin.KEY_PENDING_COMPLETIONS, "[]");
        int activeCount = prefs.getInt(TintaNativePlugin.KEY_ACTIVE_COUNT, 0);

        try {
            JSONArray arr = new JSONArray(tasksRaw);
            if (arr.length() == 0) return;

            JSONObject first = arr.optJSONObject(0);
            JSONArray nextArr = new JSONArray();
            for (int i = 1; i < arr.length(); i++) {
                nextArr.put(arr.get(i));
            }

            JSONArray pendingArr = new JSONArray(pendingRaw);
            if (first != null && first.has("id")) {
                JSONObject doneItem = new JSONObject();
                doneItem.put("id", first.getString("id"));
                doneItem.put("completedAt", System.currentTimeMillis());
                pendingArr.put(doneItem);
            }

            int nextCount = Math.max(0, activeCount - 1);
            prefs.edit()
                .putString(TintaNativePlugin.KEY_TASKS_JSON, nextArr.toString())
                .putString(TintaNativePlugin.KEY_PENDING_COMPLETIONS, pendingArr.toString())
                .putInt(TintaNativePlugin.KEY_ACTIVE_COUNT, nextCount)
                .apply();

            TintaWidgetUpdater.updateAllWidgets(context);
        } catch (Exception ignored) {
        }
    }
}
`
);

writeFileEnsureDir(
  path.join(javaPkgDir, 'TintaCalendarWidgetProvider.java'),
  `package com.tinta.eink;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;

public class TintaCalendarWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        TintaWidgetUpdater.updateCalendarWidgets(context, appWidgetManager, appWidgetIds);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            TintaWidgetUpdater.updateAllWidgets(context);
        }
    }
}
`
);

console.log('Clases Java y layouts XML de Widgets (incluyendo Calendario) generados correctamente.');
