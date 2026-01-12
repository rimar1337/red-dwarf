import { toPng } from 'html-to-image';
import { useCallback,useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// --- YOUR COMPONENT ---
interface RawOGCProps {
  privateProviderHandle?: string;
  multiple?: boolean;
  a: string;
  b: string;
  c?: string;
  d?: string;
  expiry: Date;
}

export function RawOGC({
  privateProviderHandle,
  multiple = false,
  a,
  b,
  c,
  d,
  expiry,
}: RawOGCProps) {
  const options = [a, b, c, d].filter((opt): opt is string => !!opt);
  
  const formattedDate = expiry.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    // Note: Added explicit background color to ensure PNG isn't transparent where it shouldn't be
    <div className="flex h-[520px] w-[1000px] flex-col justify-between bg-gray-900 p-4 shadow-2xl text-white overflow-hidden">
      
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        {/* Type Pill */}
        <div className="flex items-center gap-2 rounded-lg border-2 border-gray-600 px-4 py-1.5 text-lg font-bold uppercase tracking-wide text-gray-100">
          {privateProviderHandle ? <IconMdiLock /> : <IconMdiGlobe />}
          <span>{privateProviderHandle ? 'Private Poll' : 'Public Poll'}</span>
        </div>
        
        {/* Multiplicity */}
        <span className="text-2xl font-normal text-gray-300">
          {multiple ? 'Select multiple options' : 'Select one option'}
        </span>
      </div>

      {/* Options List */}
      <div className="flex flex-grow flex-col gap-4">
        {options.map((optionText, index) => (
          <div 
            key={index} 
            className="flex h-[76px] items-center justify-start truncate rounded-2xl bg-gray-800 px-8 text-3xl font-medium text-gray-50"
          >
            <span className="truncate">{optionText}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-gray-800 pt-4 text-2xl">
        {/* Expiry */}
        <div className="flex items-center gap-3 rounded-xl bg-gray-800 px-6 py-3 font-medium text-gray-200">
          <IconMdiClockOutline />
          <span>Expires {formattedDate}</span>
        </div>

        {/* Branding */}
        <div className="flex items-center gap-3 text-gray-400">
          {privateProviderHandle ? (
            <>
              <span>Private voting via</span>
              <div className="flex items-center gap-2">
                {/* provider pfp (gradient placeholder) */}
                <div className="h-[42px] w-[42px] rounded-full border border-gray-300 bg-gradient-to-br from-gray-300 to-gray-700"></div>
                <span className="font-medium text-gray-100">
                  @{privateProviderHandle}
                </span>
              </div>
            </>
          ) : (
            <span className="text-3xl font-medium text-gray-100">
              All votes are public
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- THE GENERATOR HOOK ---

export function useOGGenerator() {
  const ref = useRef<HTMLDivElement>(null);
  const [props, setProps] = useState<RawOGCProps | null>(null);

  const generate = useCallback(async (renderProps: RawOGCProps): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      // 1. Mount the component with the new props
      // eslint-disable-next-line @eslint-react/dom/no-flush-sync
      flushSync(() => {
        setProps(renderProps);
      });

      // 2. Wait a tick for styles/fonts to settle
      // A small timeout allows the DOM to fully paint the Tailwind classes
      setTimeout(async () => {
        if (!ref.current) {
          reject('Ref not found');
          return;
        }

        try {
          // 3. Capture image
          const dataUrl = await toPng(ref.current, { 
            cacheBust: true,
            pixelRatio: 1, // 1 = 1000px width. Set to 2 for Retina (2000px width)
            skipFonts: true,
          });
          
          // 4. Cleanup (Unmount)
          setProps(null);
          resolve(dataUrl);
        } catch (error) {
          console.error('Generation failed', error);
          setProps(null);
          reject(error);
        }
      }, 100); 
    });
  }, []);

  // The hidden rendering area
  // We use fixed positioning way off-screen. Display:none causes capture failures.
  const element = props ? (
    <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
      <div ref={ref}>
        <RawOGC {...props} />
      </div>
    </div>
  ) : null;

  return { generate, element };
}