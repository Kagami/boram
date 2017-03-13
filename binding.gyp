{
  "targets": [
    {
      "target_name": "boram",
      "win_delay_load_hook": "false",
      "sources": ["src/mpv/interop.cc"],
      "libraries": ["-lppapi", "-lppapi_cpp", "-lppapi_gles2"],
      "conditions": [
        ["OS=='win'", {
          "include_dirs": [
            "C:/nacl_sdk/pepper_49/include",
            "C:/mingw/local64/include",
          ],
          "libraries": ["-llibmpv.dll.a"],
          "conditions": [
            ["target_arch=='ia32'", {
              "library_dirs": [
                "C:/nacl_sdk/pepper_49/lib/win_x86_32_host/Release",
                "C:/mingw/local32/lib",
              ],
            }, "target_arch=='x64'", {
              "library_dirs": [
                "C:/nacl_sdk/pepper_49/lib/win_x86_64_host/Release",
                "C:/mingw/local64/lib",
              ],
            }],
          ],
        }, {
          "include_dirs": ["$(NACL_SDK_ROOT)/include"],
          "libraries": ["-lmpv"],
          "conditions": [
            ["OS=='linux'", {
              "defines": ["_GLIBCXX_USE_CXX11_ABI=0"],
              "library_dirs": ["$(NACL_SDK_ROOT)/lib/linux_host/Release"],
              "ldflags": ["-static-libstdc++"],
            }, "OS=='mac'", {
              "library_dirs": ["$(NACL_SDK_ROOT)/lib/mac_host/Release"],
            }],
          ],
        }],
      ],
    },
  ],
  "conditions": [
    ["OS=='linux'", {
      "targets": [
        {
          "target_name": "checklib",
          "type": "executable",
          "sources": ["src/index/checklib.c"],
          "libraries": ["-ldl"],
          "ldflags": ["-static-libstdc++"],
        },
      ],
    }],
  ],
}
