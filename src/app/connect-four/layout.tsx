import { ViewTransitions } from "next-view-transitions";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ViewTransitions>
  );
}
