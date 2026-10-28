/**
 * `<html lang>` must match the page language in the server HTML (crawlers and
 * screen readers read it before any JS runs), so `<html>` lives in
 * `[locale]/layout.tsx`. This root only passes children through.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
