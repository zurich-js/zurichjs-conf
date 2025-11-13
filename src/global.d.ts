/**
 * Global type declarations for the application
 */

// Allow importing CSS files from Swiper
declare module 'swiper/css' {
  const content: void;
  export default content;
}

declare module 'swiper/css/free-mode' {
  const content: void;
  export default content;
}

declare module 'swiper/css/*' {
  const content: void;
  export default content;
}

