import ControlConsole from "@/components/studio/ControlConsole";
import FacebookPreview from "@/components/studio/FacebookPreview";
import InstagramPreview from "@/components/studio/InstagramPreview";

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100/60">
      <div className="mx-auto max-w-[1550px] px-6 py-8">
        {/* Hero */}
        <header className="mb-8 max-w-3xl lg:mb-10">
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
            עוזר הסטודיו שלך.{" "}
            <span className="text-sky-brand">פוסט מנצח בדקה.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            הזינו את פרטי העסק והמבצע — וצפו בפוסט מתעצב בלייב לאינסטגרם
            ולפייסבוק, מוכן לפרסום.
          </p>
        </header>

        {/* 3-column Live Studio — RTL: Instagram (right) · Console · Facebook (left) */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="order-2 xl:order-none xl:col-span-3">
            <InstagramPreview />
          </div>

          <div className="order-1 xl:order-none xl:col-span-6 xl:px-2">
            <ControlConsole />
          </div>

          <div className="order-3 xl:order-none xl:col-span-3">
            <FacebookPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
