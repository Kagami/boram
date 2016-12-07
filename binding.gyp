{
  "targets": [
    {
      "target_name": "mpvinterop",
      "include_dirs": ["$(NACL_SDK_ROOT)/include"],
      "library_dirs": ["$(NACL_SDK_ROOT)/lib/linux_host/Release"],
      "libraries": ["-static-libstdc++", "-lppapi_cpp", "-lppapi_gles2", "-lmpv"],
      "defines": ["_GLIBCXX_USE_CXX11_ABI=0"],
      "sources": ["src/mpv/mpvinterop.cc"],
    },
    {
      "target_name": "ffmpegstub",
      "libraries": ["-lavcodec", "-lavformat", "-lavutil"],
    },
  ],
}
