# libgs

* [Introduction](#introduction)
* [Supported platforms](#supported_platforms)
* [Installation](#install)
* [Usage](#usage)
* [Code of conduct](CODE_OF_CONDUCT.md)
* [Team](#team)
* [Acknowledgements](#acknowledgements)
* [License](#license)

<a name="introduction"></a>

## Introduction

Ghoscript and its dependencies are provided as pre-compiled static libraries
named **libgs**. The library is avalable for the most common operating systems
and cpu architectures.

The libraries ara distributed through the [release][] or the npm registry under
[@libgs][] organisation.

<a name="supported_platforms">

## Supported platforms

The library is built for the [platforms of Node.js][Node.js platforms] that
Ghostscript can be built for, with the minimum versions Node.js requires:

|                   | x86 | x64 | armv6 | armv7 | arm64 | ppc64le | s390x | loong64 | riscv64 |
| ----------------- | --- | --- | ----- | ----- | ----- | ------- | ----- | ------- | ------- |
| Windows           | ✅  | ✅  |       |       | ✅    |         |       |         |         |
| macOS >= 13.5     |     | ✅  |       |       | ✅    |         |       |         |         |
| Linux glibc       | ✅  | ✅  | ✅    | ✅    | ✅    | ✅      | ✅    | ✅      | ✅      |
| Linux musl        |     | ✅  | ✅    | ✅    | ✅    |         |       |         |         |
| FreeBSD           |     | ✅  |       |       |       |         |       |         |         |

The Linux glibc libraries require glibc 2.17 on x86, 2.28 on armv6 and
armv7, 2.36 on loong64 and riscv64 and 2.34 on the other architectures.

Three platforms of Node.js are missing: SmartOS and AIX, for which there is
neither a cross-compiler nor a GitHub Actions runner, and OpenHarmony, which
needs the OpenHarmony SDK.

### Packages

- [@libgs/darwin-aarch64][]
- [@libgs/darwin-x64][]
- [@libgs/freebsd-x64][]
- [@libgs/linux-arm64][]
- [@libgs/linux-armv6][]
- [@libgs/linux-armv7][]
- [@libgs/linux-ia32][]
- [@libgs/linux-loong64][]
- [@libgs/linux-ppc64][] (ppc64le)
- [@libgs/linux-riscv64][]
- [@libgs/linux-s390x][]
- [@libgs/linux-x64][]
- [@libgs/linux-musl-arm64][]
- [@libgs/linux-musl-armv6][]
- [@libgs/linux-musl-armv7][]
- [@libgs/linux-musl-x64][]
- [@libgs/win32-arm64][]
- [@libgs/win32-x64][]
- [@libgs/win32-x86][]

<a name="install"></a>

## Installation

### Download pre-compiled binary

You can download the pre-compiled binary for each version from the [release][] page,
or you can do npm install <package-name> es. `npm install @libgs/win32-x64`

The npm packages contain the libraries, in their `lib` directory, and the
headers of the Ghostscript API (`iapi.h`, `ierrors.h`, `gserrors.h` and
`gdevdsp.h`), in their `include` directory, and have no install scripts.
Platform packages declare their `os`, `cpu` and `libc`, so npm only 
installs the package matching the system.

### Create the npm packages

Publishing a GitHub release builds the libraries and uploads the archives,
named `gs-<platform>-<arch>.tar.gz` after the packages, to the release. Then

```sh
npm run make                        # from the latest release
npm run make -- --tag v0.0.14       # from a given release
```

downloads the archives of the release, checks their size and SHA-256 digest
and creates a package in `npm/@libgs` for each archive, with the version of
the release (`--version` sets another one). Platforms without an archive in
the release are skipped. Set `GITHUB_TOKEN` if the GitHub API rate limit is
reached.

### Publish the npm packages

```sh
npm run publish                   # publish the packages in npm/@libgs
npm run publish -- --dry-run      # check them without publishing
npm run publish -- --tag next     # publish with another dist-tag
```

publishes the packages in `npm/@libgs` one at a time, with public access.
Each `npm publish` runs in the terminal, so npm asks for the authentication
of every package: the one-time password or the confirmation in the browser
of the two-factor authentication. If no user is logged in, or the session
expires, the script runs `npm login` first. The versions already on the
registry are skipped, so after a failure the script can be run again to
publish the remaining packages.

### Compile from source

If you want to compile the library from source, you can do it with `npm start`

### Cross-compile with Zig

On Linux, with [Zig][] 0.16 on the `PATH`, you can cross-compile for Linux
and FreeBSD. The Linux and FreeBSD libraries of the releases are built this
way:

```sh
node index.js -z aarch64-linux-musl
node index.js -z riscv64-linux-gnu.2.36
node index.js -z x86_64-linux-gnu.2.34   # require glibc 2.34 or later
node index.js -z armv6-linux-musleabihf  # Raspberry Pi 1 and Zero
node index.js -z x86_64-freebsd
```

The archive is named after the package, e.g. `gs-linux-musl-arm64.tar.gz`.
For 32-bit ARM the target architecture can be `armv6` or `armv7` (`arm` is
the same as `armv7`).

### Compile for Windows

In a Visual Studio developer prompt of the target architecture (`vcvarsall
x64`, `vcvarsall amd64_x86` or `vcvarsall arm64`), run
`node index.js -p windows -a <x64|x86|arm64>`: the Ghostscript makefile
builds for the architecture of the compiler on the `PATH`.

<a name="usage"></a>

## Usage

Each package contains Ghostscript built for one platform, to be used from C,
C++ or a Node.js native addon through the [Ghostscript API][]:

| Platform               | `lib`                                                         | Link with                         |
| ---------------------- | ------------------------------------------------------------- | --------------------------------- |
| Linux, FreeBSD         | `gs.a`, a static library                                      | `gs.a -lm -ldl -lpthread`         |
| macOS                  | `gs.a`, a static library                                      | `gs.a -lm -ldl -lpthread -liconv` |
| Windows x64 and arm64  | `gsdll64.dll` and its import library `gsdll64.lib`            | `gsdll64.lib`, ship `gsdll64.dll` |
| Windows x86            | `gsdll32.dll` and its import library `gsdll32.lib`            | `gsdll32.lib`, ship `gsdll32.dll` |

The Windows packages also contain the DLLs of GhostPCL (`gpcl6dll`), GhostXPS
(`gxpsdll`), GhostPDF (`gpdfdll`) and GhostPDL (`gpdldll`). The static
libraries are self-contained: they do not depend on X11, CUPS, fontconfig or
other libraries of the system, and they are built without the OCR devices,
which need Tesseract and a C++ runtime.

The `include` directory contains the headers of the API: `iapi.h` (the
functions), `ierrors.h` and `gserrors.h` (the error codes) and `gdevdsp.h`
(the display device).

### Install the package of the platform

Add every package to the `optionalDependencies`: npm only installs the one
matching the `os`, `cpu` and `libc` of the system and skips the others.

```json
{
  "optionalDependencies": {
    "@libgs/darwin-aarch64": "x.y.z",
    "@libgs/darwin-x64": "x.y.z",
    "@libgs/freebsd-x64": "x.y.z",
    "@libgs/linux-arm64": "x.y.z",
    "@libgs/linux-x64": "x.y.z",
    "@libgs/linux-musl-x64": "x.y.z",
    "@libgs/win32-arm64": "x.y.z",
    "@libgs/win32-x64": "x.y.z",
    "@libgs/win32-x86": "x.y.z"
  }
}
```

and so on for the other [packages](#packages).

The armv6 and armv7 packages both declare the `arm` cpu, as npm cannot tell
the two apart, so npm installs both on 32-bit ARM Linux: choose the one to
use with `process.config.variables.arm_version`, as the function below does.

### Find the library

Each package exports an object with the directory of the libraries, their
names, the directory of the headers and their names:

```js
const { path, files, include, headers } = require("@libgs/linux-x64");
// path:    /…/node_modules/@libgs/linux-x64/lib
// files:   ["gs.a"]
// include: /…/node_modules/@libgs/linux-x64/include
// headers: ["gdevdsp.h", "gserrors.h", "iapi.h", "ierrors.h"]
```

The package names keep some historical architecture names, which differ from
`process.arch`. This function gives the name of the package for the running
system:

```js
function libgsPackage() {
  const { platform, arch } = process;
  switch (platform) {
    case "darwin":
      return `@libgs/darwin-${arch === "arm64" ? "aarch64" : arch}`;
    case "win32":
      return `@libgs/win32-${arch === "ia32" ? "x86" : arch}`;
    case "freebsd":
      return `@libgs/freebsd-${arch}`;
    case "linux": {
      const musl = !process.report.getReport().header.glibcVersionRuntime;
      const cpu =
        arch === "arm" ? `armv${process.config.variables.arm_version}` : arch;
      return `@libgs/linux-${musl ? "musl-" : ""}${cpu}`;
    }
    default:
      throw new Error(`libgs is not available for ${platform}-${arch}`);
  }
}
```

### Use it in a native addon

A native addon is a shared library (the `.node` file) that links libgs:

- on Linux, macOS and FreeBSD it links `gs.a` and the system libraries of the
  [table above](#usage), so the addon contains Ghostscript;
- on Windows it links the import library and needs the DLL next to the
  `.node` file, where Windows looks for it when loading the addon. Define
  `_Windows` too: it makes `iapi.h` declare the functions `__stdcall`, as the
  DLL exports them. It matters on x86, where calling them with another
  convention corrupts the stack; including `windows.h` before `iapi.h`
  defines it as well.

This addon, saved as `src/addon.c`, exports the revision of Ghostscript
(`10080` for 10.08.0) and is built below with [node-gyp][], [cmake-js][] and
[Marmotta][]:

```c
#include <node_api.h>
#include "iapi.h"

static napi_value Revision(napi_env env, napi_callback_info info)
{
    gsapi_revision_t revision;
    napi_value result;
    if (gsapi_revision(&revision, sizeof(revision)) != 0) {
        napi_throw_error(env, NULL, "gsapi_revision failed");
        return NULL;
    }
    napi_create_int32(env, (int32_t)revision.revision, &result);
    return result;
}

static napi_value Init(napi_env env, napi_value exports)
{
    napi_value fn;
    napi_create_function(env, "revision", NAPI_AUTO_LENGTH, Revision, NULL, &fn);
    napi_set_named_property(env, exports, "revision", fn);
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
```

#### node-gyp

`binding.gyp` gets the paths from a small script. Save it as `libgs.js` in the
root of the project, with the `libgsPackage` function above:

```js
"use strict";
const path = require("node:path");

// function libgsPackage() { ... }

const { path: lib, files, include } = require(libgsPackage());
// gs.a, or the import library of gsdll32.dll or gsdll64.dll on Windows.
const library = files.find((file) => /^(gs\.a|gsdll(32|64)\.lib)$/.test(file));
const output = {
  include,
  library: path.join(lib, library),
  dll: library.endsWith(".lib")
    ? path.join(lib, library.replace(/\.lib$/, ".dll"))
    : "",
};
console.log(output[process.argv[2]]);
```

```json
{
  "targets": [
    {
      "target_name": "addon",
      "sources": ["src/addon.c"],
      "include_dirs": ["<!(node libgs.js include)"],
      "libraries": ["<!(node libgs.js library)"],
      "conditions": [
        ["OS != 'win'", { "libraries": ["-lm", "-ldl", "-lpthread"] }],
        ["OS == 'mac'", { "libraries": ["-liconv"] }],
        ["OS == 'win'", {
          "defines": ["_Windows"],
          "copies": [{
            "destination": "<(PRODUCT_DIR)",
            "files": ["<!(node libgs.js dll)"]
          }]
        }]
      ]
    }
  ]
}
```

#### cmake-js

`CMakeLists.txt` gets the paths from the same `libgs.js` script:

```cmake
cmake_minimum_required(VERSION 3.15...3.31)
project(addon)

add_compile_definitions(NAPI_VERSION=8)

add_library(${PROJECT_NAME} SHARED src/addon.c ${CMAKE_JS_SRC})
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})
target_link_libraries(${PROJECT_NAME} PRIVATE ${CMAKE_JS_LIB})

# Runs libgs.js to get a path of libgs.
function(libgs_path name output)
  execute_process(
    COMMAND node libgs.js ${name}
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    OUTPUT_VARIABLE value
    OUTPUT_STRIP_TRAILING_WHITESPACE
    RESULT_VARIABLE result)
  if(NOT result EQUAL 0)
    message(FATAL_ERROR "node libgs.js ${name} failed")
  endif()
  file(TO_CMAKE_PATH "${value}" value)
  set(${output} "${value}" PARENT_SCOPE)
endfunction()

libgs_path(include LIBGS_INCLUDE)
libgs_path(library LIBGS_LIBRARY)
target_include_directories(${PROJECT_NAME} PRIVATE ${LIBGS_INCLUDE})
target_link_libraries(${PROJECT_NAME} PRIVATE ${LIBGS_LIBRARY})

if(WIN32)
  libgs_path(dll LIBGS_DLL)
  target_compile_definitions(${PROJECT_NAME} PRIVATE _Windows)
  add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different ${LIBGS_DLL}
            $<TARGET_FILE_DIR:${PROJECT_NAME}>)
else()
  target_link_libraries(${PROJECT_NAME} PRIVATE m dl pthread)
  if(APPLE)
    target_link_libraries(${PROJECT_NAME} PRIVATE iconv)
  endif()
endif()

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
  # Generate node.lib
  execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF}
                  /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()
```

`npx cmake-js compile` builds `build/Release/addon.node`, and on Windows copies
the DLL next to it.

#### Marmotta

[Marmotta][] builds the addon with Zig and reads its configuration from
`marmotta.config.js`, which can compute the paths itself. Add the
`libgsPackage` function above to it:

```js
"use strict";
const fs = require("node:fs");
const path = require("node:path");

// function libgsPackage() { ... }

module.exports = ({ directory, target, platform }) => {
  const windows = target ? target.includes("windows") : platform === "win32";
  const macos = target ? target.includes("macos") : platform === "darwin";
  const { path: lib, files, include } = require(libgsPackage());
  // gs.a, or the import library of gsdll32.dll or gsdll64.dll on Windows.
  const library = files.find((file) => /^(gs\.a|gsdll(32|64)\.lib)$/.test(file));
  const outputDir = path.join(directory, "build");
  if (windows) {
    // Windows looks for the DLL next to the addon.
    const dll = library.replace(/\.lib$/, ".dll");
    fs.mkdirSync(outputDir, { recursive: true });
    fs.copyFileSync(path.join(lib, dll), path.join(outputDir, dll));
  }
  return {
    name: "addon",
    sources: ["src/addon.c"],
    includeDirs: [include],
    cFlags: windows ? ["-D_Windows"] : [],
    linkerFlags: [
      path.join(lib, library),
      ...(windows ? [] : ["-lm", "-ldl", "-lpthread"]),
      ...(macos ? ["-liconv"] : []),
    ],
    outputDir,
  };
};
```

```sh
npx marmotta build
node -e "console.log(require('./build/addon.node').revision())"   # 10080
```

`libgsPackage` gives the package of the system running Marmotta: to
cross-compile with `--target`, require the package of the target instead,
e.g. `@libgs/linux-arm64` for `--target aarch64-linux-gnu`. On Windows, Zig
uses the MinGW ABI, with which `iapi.h` declares the functions without
`__stdcall` even when `_Windows` is defined: Windows x86 cannot be built with
Marmotta, while x64 and arm64 have a single calling convention and work. On
macOS, `-liconv` needs the macOS SDK (the Xcode Command Line Tools), which
Zig uses to find the system libraries.

### Call Ghostscript

This program converts a PDF into PNG images, like
`gs -sDEVICE=png16m -o page-%d.png input.pdf`:

```c
#include <stdio.h>
#include "iapi.h"
#include "ierrors.h"

int main(void)
{
    void *instance = NULL;
    char *args[] = {
        "gs", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET",
        "-sDEVICE=png16m", "-r150", "-o", "page-%d.png", "input.pdf"
    };
    int code = gsapi_new_instance(&instance, NULL);
    if (code < 0) {
        fprintf(stderr, "gsapi_new_instance failed: %d\n", code);
        return 1;
    }
    gsapi_set_arg_encoding(instance, GS_ARG_ENCODING_UTF8);
    code = gsapi_init_with_args(instance, sizeof(args) / sizeof(args[0]), args);
    int exit_code = gsapi_exit(instance);
    if (code == 0 || code == gs_error_Quit)
        code = exit_code;
    gsapi_delete_instance(instance);
    if (code != 0 && code != gs_error_Quit) {
        fprintf(stderr, "Ghostscript failed: %d\n", code);
        return 1;
    }
    return 0;
}
```

Build it on Linux, macOS or FreeBSD with:

```sh
LIBGS=node_modules/@libgs/linux-x64
cc main.c -I "$LIBGS/include" "$LIBGS/lib/gs.a" -lm -ldl -lpthread -o pdf2png
```

adding `-liconv` on macOS, where iconv is not part of the C library, and on
Windows, in a Visual Studio developer prompt, with:

```bat
set LIBGS=node_modules\@libgs\win32-x64
cl /D_Windows main.c /I "%LIBGS%\include" "%LIBGS%\lib\gsdll64.lib"
copy "%LIBGS%\lib\gsdll64.dll" .
```

An instance is not thread-safe: use each one from a single thread, or create
one instance per thread. The fonts and the PostScript resources are built into
the library, so no other file is needed at run time.


<a name="team"></a>

## The Team

### Nicola Del Gobbo

<https://github.com/NickNaso/>

<https://www.npmjs.com/~nicknaso>

<https://twitter.com/NickNaso>

### Simone Russo

<https://github.com/ErRusso>

<a name="acknowledgements"></a>

## Acknowledgements

Thank you to all people that encourage me every day.

<a name="license"></a>

## License

Licensed under [Apache license V2](./LICENSE)

[release]: https://github.com/NickNaso/libgs/releases
[Zig]: https://ziglang.org/download/
[node-gyp]: https://github.com/nodejs/node-gyp
[cmake-js]: https://github.com/cmake-js/cmake-js
[Marmotta]: https://github.com/napi-bindings/marmotta
[Ghostscript API]: https://ghostscript.readthedocs.io/en/latest/API.html
[Node.js platforms]: https://github.com/nodejs/node/blob/main/BUILDING.md#platform-list
[@libgs]: https://www.npmjs.com/org/libgs
[@libgs/darwin-aarch64]: https://www.npmjs.com/package/@libgs/darwin-aarch64
[@libgs/darwin-x64]: https://www.npmjs.com/package/@libgs/darwin-x64
[@libgs/freebsd-x64]: https://www.npmjs.com/package/@libgs/freebsd-x64
[@libgs/linux-armv6]: https://www.npmjs.com/package/@libgs/linux-armv6
[@libgs/linux-armv7]: https://www.npmjs.com/package/@libgs/linux-armv7
[@libgs/linux-arm64]: https://www.npmjs.com/package/@libgs/linux-arm64
[@libgs/linux-ia32]: https://www.npmjs.com/package/@libgs/linux-ia32
[@libgs/linux-loong64]: https://www.npmjs.com/package/@libgs/linux-loong64
[@libgs/linux-ppc64]: https://www.npmjs.com/package/@libgs/linux-ppc64
[@libgs/linux-riscv64]: https://www.npmjs.com/package/@libgs/linux-riscv64
[@libgs/linux-s390x]: https://www.npmjs.com/package/@libgs/linux-s390x
[@libgs/linux-x64]: https://www.npmjs.com/package/@libgs/linux-x64
[@libgs/linux-musl-armv6]: https://www.npmjs.com/package/@libgs/linux-musl-armv6
[@libgs/linux-musl-armv7]: https://www.npmjs.com/package/@libgs/linux-musl-armv7
[@libgs/linux-musl-arm64]: https://www.npmjs.com/package/@libgs/linux-musl-arm64
[@libgs/linux-musl-x64]: https://www.npmjs.com/package/@libgs/linux-musl-x64
[@libgs/win32-arm64]: https://www.npmjs.com/package/@libgs/win32-arm64
[@libgs/win32-x86]: https://www.npmjs.com/package/@libgs/win32-x86
[@libgs/win32-x64]: https://www.npmjs.com/package/@libgs/win32-x64