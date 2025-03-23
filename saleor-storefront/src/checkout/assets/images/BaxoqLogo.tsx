import Image from "next/image";

export function BaxoqLogo() {
  return (
    <div className="flex items-center">
      <Image 
        src="/media/logo.png" 
        alt="Baxoq Logo" 
        width={180} 
        height={60} 
        className="h-auto w-full" 
      />
    </div>
  );
}
