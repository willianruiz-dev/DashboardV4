/* RUTA: src/app/globals.css */
@import "tailwindcss";

@theme {
  /* ---- MARCA (verificar con color picker) ---- */
  --color-brand-50:  #EEF3FE;
  --color-brand-100: #D9E4FD;
  --color-brand-200: #B4C9FB;
  --color-brand-300: #8AAAF8;
  --color-brand-400: #4C7CF4;
  --color-brand-500: #1652F0;  /* ← Azul principal E-city */
  --color-brand-600: #0F41C9;
  --color-brand-700: #0C33A0;
  --color-brand-800: #0A2878;
  --color-brand-900: #071C55;

  /* ---- SECUNDARIO (cian corporativo) ---- */
  --color-accent-50:  #EAF6FC;
  --color-accent-100: #CFEAF8;
  --color-accent-200: #A2D5F0;
  --color-accent-300: #6FBCE6;
  --color-accent-400: #2D9CDB;  /* ← Cian E-city */
  --color-accent-500: #1F7FB5;
  --color-accent-600: #186691;
  --color-accent-700: #134F70;
  --color-accent-800: #0E3A52;
  --color-accent-900: #092838;

  /* ---- NEUTRALES (carbón azulado, no gris puro) ---- */
  --color-neutral-0:   #FFFFFF;
  --color-neutral-50:  #F7F8FA;
  --color-neutral-100: #F1F2F4;
  --color-neutral-200: #E3E5E9;
  --color-neutral-300: #C9CCD3;
  --color-neutral-400: #9AA0AB;
  --color-neutral-500: #6E7480;
  --color-neutral-600: #4E535D;
  --color-neutral-700: #3A3E46;
  --color-neutral-800: #2E2E30;
  --color-neutral-900: #1C1D21;
  --color-neutral-950: #0E0F13;

  /* ---- ESTADOS (derivados, no vienen de la marca) ---- */
  --color-success-100: #D7F5E4;
  --color-success-500: #12A05C;
  --color-success-700: #0B7241;

  --color-warning-100: #FDF0D2;
  --color-warning-500: #C98A06;
  --color-warning-700: #8F6104;

  --color-danger-100:  #FCE0E0;
  --color-danger-500:  #D32F2F;
  --color-danger-700:  #9A2020;

  --color-info-100:    #DDECFD;
  --color-info-500:    #1E7FD4;
  --color-info-700:    #155C99;

  /* ---- TIPOGRAFÍA ---- */
  --font-sans:    "Poppins", ui-sans-serif, system-ui, sans-serif;
  --font-mono:    "JetBrains Mono", ui-monospace, monospace;
  --font-numeric: "Inter", ui-sans-serif, system-ui, sans-serif;

  /* ---- RADIOS ---- */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}

/* =========================================================
   MAPEO A SHADCN UI — MODO CLARO
   ========================================================= */
:root {
  --background:            var(--color-neutral-50);
  --foreground:            var(--color-neutral-900);

  --card:                  var(--color-neutral-0);
  --card-foreground:       var(--color-neutral-900);

  --popover:               var(--color-neutral-0);
  --popover-foreground:    var(--color-neutral-900);

  --primary:               var(--color-brand-500);
  --primary-foreground:    var(--color-neutral-0);

  --secondary:             var(--color-neutral-100);
  --secondary-foreground:  var(--color-neutral-800);

  --muted:                 var(--color-neutral-100);
  --muted-foreground:      var(--color-neutral-500);

  --accent:                var(--color-accent-400);
  --accent-foreground:     var(--color-neutral-0);

  --destructive:           var(--color-danger-500);
  --destructive-foreground:var(--color-neutral-0);

  --border:                var(--color-neutral-200);
  --input:                 var(--color-neutral-300);
  --ring:                  var(--color-brand-500);

  --radius: var(--radius-md);

  /* Semánticos propios del dominio financiero */
  --amount-positive:       var(--color-success-700);
  --amount-negative:       var(--color-danger-700);
  --state-pending:         var(--color-warning-500);
  --state-processing:      var(--color-info-500);
  --state-confirmed:       var(--color-success-500);
  --state-failed:          var(--color-danger-500);
  --connection-online:     var(--color-success-500);
  --connection-offline:    var(--color-danger-500);
  --connection-reconnect:  var(--color-warning-500);
}

/* =========================================================
   MODO OSCURO — refleja el hero y la sección de módulos
   ========================================================= */
.dark {
  --background:            var(--color-neutral-950);
  --foreground:            var(--color-neutral-100);

  --card:                  var(--color-neutral-900);
  --card-foreground:       var(--color-neutral-100);

  --popover:               var(--color-neutral-900);
  --popover-foreground:    var(--color-neutral-100);

  --primary:               var(--color-brand-400);
  --primary-foreground:    var(--color-neutral-950);

  --secondary:             var(--color-neutral-800);
  --secondary-foreground:  var(--color-neutral-100);

  --muted:                 var(--color-neutral-800);
  --muted-foreground:      var(--color-neutral-400);

  --accent:                var(--color-accent-300);
  --accent-foreground:     var(--color-neutral-950);

  --destructive:           #F26B6B;
  --destructive-foreground:var(--color-neutral-950);

  --border:                var(--color-neutral-700);
  --input:                 var(--color-neutral-700);
  --ring:                  var(--color-brand-400);

  --amount-positive:       #3FD189;
  --amount-negative:       #F58A8A;
  --state-pending:         #E8B23A;
  --state-processing:      #5AAEF0;
  --state-confirmed:       #3FD189;
  --state-failed:          #F26B6B;
  --connection-online:     #3FD189;
  --connection-offline:    #F26B6B;
  --connection-reconnect:  #E8B23A;
}

/* Cifras monetarias: tabulares y alineadas a la derecha */
@layer base {
  .tabular {
    font-family: var(--font-numeric);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
  }
}