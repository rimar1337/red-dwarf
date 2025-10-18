import { Link, useRouter } from "@tanstack/react-router";

export function Header({
  backButtonCallback,
  title
}: {
  backButtonCallback?: () => void;
  title?: string;
}) {
  const router = useRouter();
  //const what = router.history.
  return (
    <div className="flex items-center gap-4 px-4 py-3 h-[52px] sticky top-0 bg-white dark:bg-gray-950 z-10 border-b border-gray-200 dark:border-gray-700">
      {backButtonCallback ? (<Link
        to=".."
        //className="px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-900 font-bold text-lg"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 font-bold text-lg"
        onClick={(e) => {
          e.preventDefault();
          backButtonCallback();
        }}
        aria-label="Go back"
      >
        <IconMaterialSymbolsArrowBack className="w-6 h-6" />
      </Link>) : (<div className="w-[0px]" />)}
      <span className="text-[21px] font-roboto">{title}</span>
    </div>
  );
}
