import {
  createFileRoute,
  useNavigate,
  type UseNavigateResult,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ProfilePostComponent } from "./post.$rkey";

export const Route = createFileRoute("/profile/$did/post/$rkey/image/$i")({
  component: Lightbox,
});

export type LightboxProps = {
  images: { src: string; alt?: string }[];
};

function nextprev({
  index,
  images,
  navigate,
  did,
  rkey,
  prev,
}: {
  index?: number;
  images?: LightboxProps["images"];
  navigate: UseNavigateResult<string>;
  did: string;
  rkey: string;
  prev?: boolean;
}) {
  const len = images?.length ?? 0;
  if (len === 0) return;

  const nextIndex = ((index ?? 0) + (prev ? -1 : 1) + len) % len;

  navigate({
    to: "/profile/$did/post/$rkey/image/$i",
    params: {
      did,
      rkey,
      i: nextIndex.toString(),
    },
    replace: true,
  });
}

export function Lightbox() {
  console.log("hey the $i route is loaded w!!!");
  const { did, rkey, i } = Route.useParams();
  const [images, setImages] = useState<LightboxProps["images"] | undefined>(
    undefined
  );
  const index = Number(i);
  const navigate = useNavigate();
  const post = true;
  const image = images?.[index] ?? undefined;

  function lightboxCallback(d: LightboxProps) {
    console.log("callback actually called!");
    setImages(d.images);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") window.history.back();
      if (e.key === "ArrowRight")
        nextprev({ index, images, navigate, did, rkey });
      //onNavigate((index + 1) % images.length);
      if (e.key === "ArrowLeft")
        nextprev({ index, images, navigate, did, rkey, prev: true });
      //onNavigate((index - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, navigate, did, rkey, images]);

  return createPortal(
    <>
      {post && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          className="lightbox-sidebar hidden lg:flex overscroll-none disablegutter border-l dark:border-gray-800 was7 border-gray-300 fixed z-50 flex top-0 right-0 flex-col max-w-[350px] min-w-[350px] max-h-screen overflow-y-scroll dark:bg-gray-950 bg-white"
        >
          <ProfilePostComponent
            key={`/profile/${did}/post/${rkey}`}
            did={did}
            rkey={rkey}
            nopics
            lightboxCallback={lightboxCallback}
          />
        </div>
      )}
      <div
        className="lightbox fixed inset-0 z-50 flex items-center justify-center bg-black/80 w-screen lg:w-[calc(100vw-350px)] lg:max-w-[calc(100vw-350px)]"
        onClick={(e) => {
          e.stopPropagation();
          window.history.back();
        }}
      >
        <img
          src={image?.src}
          alt={image?.alt}
          className="max-h-[90%] max-w-[90%] object-contain rounded-lg shadow-lg"
          onClick={(e) => e.stopPropagation()}
        />

        {(images?.length ?? 0) > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextprev({ index, images, navigate, did, rkey, prev: true });
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={28}
                height={28}
                viewBox="0 0 24 24"
              >
                <g fill="none" fillRule="evenodd">
                  <path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"></path>
                  <path
                    fill="currentColor"
                    d="M8.293 12.707a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 1 1 1.414 1.414L10.414 12l4.95 4.95a1 1 0 0 1-1.414 1.414z"
                  ></path>
                </g>
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextprev({ index, images, navigate, did, rkey });
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={28}
                height={28}
                viewBox="0 0 24 24"
              >
                <g fill="none" fillRule="evenodd">
                  <path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"></path>
                  <path
                    fill="currentColor"
                    d="M15.707 11.293a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 1 1-1.414-1.414l4.95-4.95l-4.95-4.95a1 1 0 0 1 1.414-1.414z"
                  ></path>
                </g>
              </svg>
            </button>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
