#include <dlfcn.h>

int main(int argc, char *argv[]) {
    void *handle;
    if (argc != 2) return 1;
    handle = dlopen(argv[1], RTLD_LAZY);
    return !handle;
}
