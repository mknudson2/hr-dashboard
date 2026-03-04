export default function BifrostAdminLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/bifrost-logo.png"
        alt="Bifröst"
        className="w-7 h-7 object-contain"
      />
      <div>
        <div className="font-display text-[13px] font-semibold text-gray-900 dark:text-white tracking-[2px]">
          BIFRÖST
        </div>
        <div className="text-[9.5px] text-gray-400 dark:text-gray-500 tracking-wide">
          HR Hub · Admin
        </div>
      </div>
    </div>
  );
}
