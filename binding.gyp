{
  "targets": [
    {
      "target_name": "mpvinterop",
      "sources": ["src/mpv/mpvinterop.cc"],
      "libraries": ["-lppapi_cpp", "-lppapi_gles2", "-lmpv"],
      "conditions": [
        ["OS=='linux'", {
          "defines": ["_GLIBCXX_USE_CXX11_ABI=0"],
          "include_dirs": ["$(NACL_SDK_ROOT)/include"],
          "library_dirs": ["$(NACL_SDK_ROOT)/lib/linux_host/Release"],
          "ldflags": ["-static-libstdc++"],
        }, "OS=='win'", {
        }],
      ],
    },
  ],
  "conditions": [
    ["OS=='linux'", {
      "targets": [
        {
          "target_name": "ffmpeg",
          "libraries": ["-lavcodec", "-lavformat", "-lavutil"],
        },
      ],
    }],
  ],
}
