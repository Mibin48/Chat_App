import React from 'react';
import { LoaderIcon } from "lucide-react";

function PageLoader() {
  return (
    /* inset-0: sets top, bottom, left, and right to 0
       fixed: ensures it stays centered even if the page is long
       z-50: ensures it stays above your background decorators
    */
    <div className='fixed inset-0 flex items-center justify-center bg-slate-900 z-50'>
        <LoaderIcon className='size-12 animate-spin text-cyan-500' />
    </div>
  );
}

export default PageLoader;