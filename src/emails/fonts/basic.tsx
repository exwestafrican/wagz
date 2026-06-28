import { Font } from '@react-email/components';

export function EnvoyeFonts() {
  return (
    <>
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Arial', 'sans-serif']}
        webFont={{
          url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuOKfMZg.ttf',
          format: 'truetype',
        }}
        fontWeight={300}
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Arial', 'sans-serif']}
        webFont={{
          url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2',
          format: 'woff2',
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Inter"
        fallbackFontFamily={['Arial', 'sans-serif']}
        webFont={{
          url: 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf',
          format: 'truetype',
        }}
        fontWeight={500}
        fontStyle="normal"
      />
      <Font
        fontFamily="Roboto Mono"
        fallbackFontFamily={['monospace']}
        webFont={{
          url: 'https://fonts.gstatic.com/s/robotomono/v31/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vqPQw.ttf',
          format: 'truetype',
        }}
        fontWeight={400}
        fontStyle="normal"
      />
    </>
  );
}
