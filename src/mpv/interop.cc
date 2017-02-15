#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <string>
#include <unordered_map>
#include <mutex>
#define GL_GLEXT_PROTOTYPES
#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>
#include <ppapi/cpp/module.h>
#include <ppapi/cpp/instance.h>
#include <ppapi/cpp/var.h>
#include <ppapi/cpp/var_dictionary.h>
#include <ppapi/cpp/graphics_3d.h>
#include <ppapi/lib/gl/gles2/gl2ext_ppapi.h>
#include <ppapi/utility/completion_callback_factory.h>
#ifdef BORAM_WIN_BUILD
#include "client.h"
#include "opengl_cb.h"
#else
#include <mpv/client.h>
#include <mpv/opengl_cb.h>
#endif

// Fix for MSVS.
#ifdef PostMessage
#undef PostMessage
#endif

#define QUOTE(arg) #arg
#define DIE(msg) { fprintf(stderr, "%s\n", msg); return false; }
#define GLCB(name) { QUOTE(gl##name), reinterpret_cast<void*>(gl##name) }

using pp::Var;

// PPAPI GLES implementation doesn't provide getProcAddress.
static const std::unordered_map<std::string, void*> GL_CALLBACKS = {
  GLCB(GetString),
  GLCB(ActiveTexture),
  GLCB(AttachShader),
  GLCB(BindAttribLocation),
  GLCB(BindBuffer),
  GLCB(BindTexture),
  GLCB(BlendFuncSeparate),
  GLCB(BufferData),
  GLCB(Clear),
  GLCB(ClearColor),
  GLCB(CompileShader),
  GLCB(CreateProgram),
  GLCB(CreateShader),
  GLCB(DeleteBuffers),
  GLCB(DeleteProgram),
  GLCB(DeleteShader),
  GLCB(DeleteTextures),
  GLCB(Disable),
  GLCB(DisableVertexAttribArray),
  GLCB(DrawArrays),
  GLCB(Enable),
  GLCB(EnableVertexAttribArray),
  GLCB(Finish),
  GLCB(Flush),
  GLCB(GenBuffers),
  GLCB(GenTextures),
  GLCB(GetAttribLocation),
  GLCB(GetError),
  GLCB(GetIntegerv),
  GLCB(GetProgramInfoLog),
  GLCB(GetProgramiv),
  GLCB(GetShaderInfoLog),
  GLCB(GetShaderiv),
  GLCB(GetString),
  GLCB(GetUniformLocation),
  GLCB(LinkProgram),
  GLCB(PixelStorei),
  GLCB(ReadPixels),
  GLCB(Scissor),
  GLCB(ShaderSource),
  GLCB(TexImage2D),
  GLCB(TexParameteri),
  GLCB(TexSubImage2D),
  GLCB(Uniform1f),
  GLCB(Uniform2f),
  GLCB(Uniform3f),
  GLCB(Uniform1i),
  GLCB(UniformMatrix2fv),
  GLCB(UniformMatrix3fv),
  GLCB(UseProgram),
  GLCB(VertexAttribPointer),
  GLCB(Viewport),
  GLCB(BindFramebuffer),
  GLCB(GenFramebuffers),
  GLCB(DeleteFramebuffers),
  GLCB(CheckFramebufferStatus),
  GLCB(FramebufferTexture2D),
  GLCB(GetFramebufferAttachmentParameteriv),
  GLCB(GenQueriesEXT),
  GLCB(DeleteQueriesEXT),
  GLCB(BeginQueryEXT),
  GLCB(EndQueryEXT),
  // Few functions are not available in PPAPI or doesn't work properly.
  {"glQueryCounterEXT", NULL},
  GLCB(IsQueryEXT),
  {"glGetQueryObjectivEXT", NULL},
  {"glGetQueryObjecti64vEXT", NULL},
  GLCB(GetQueryObjectuivEXT),
  {"glGetQueryObjectui64vEXT", NULL},
  {"glGetTranslatedShaderSourceANGLE", NULL}
};

class BoramInstance : public pp::Instance {
 public:
  explicit BoramInstance(PP_Instance instance)
      : pp::Instance(instance),
        callback_factory_(this),
        mpv_(NULL),
        mpv_gl_(NULL),
        src_(NULL),
        width_(0),
        height_(0),
        gl_ready_(false),
        is_painting_(false),
        needs_paint_(false) {}

  virtual ~BoramInstance() {
    if (mpv_gl_) {
      glSetCurrentContextPPAPI(context_.pp_resource());
      mpv_opengl_cb_uninit_gl(mpv_gl_);
    }
    mpv_terminate_destroy(mpv_);
    delete[] src_;
  }

  virtual bool Init(uint32_t argc, const char* argn[], const char* argv[]) {
    for (uint32_t i = 0; i < argc; i++) {
      if (strcmp(argn[i], "data-boramsrc") == 0) {
        src_ = new char[strlen(argv[i]) + 1];
        strcpy(src_, argv[i]);
        break;
      }
    }
    if (!src_)
      return false;

    if (!InitGL())
      return false;
    if (!InitMPV())
      return false;

    return true;
  }

  virtual void DidChangeView(const pp::View& view) {
    int32_t new_width = static_cast<int32_t>(
        view.GetRect().width() * view.GetDeviceScale());
    int32_t new_height = static_cast<int32_t>(
        view.GetRect().height() * view.GetDeviceScale());
    // printf("@@@ RESIZE %d %d\n", new_width, new_height);

    int32_t result = context_.ResizeBuffers(new_width, new_height);
    if (result < 0) {
      fprintf(stderr,
              "unable to resize buffers to %d x %d\n",
              new_width,
              new_height);
      return;
    }

    width_ = new_width;
    height_ = new_height;
    gl_ready_ = true;
    OnGetFrame(0);
  }

  virtual void HandleMessage(const Var& message) {
    if (!message.is_dictionary())
      return;
    pp::VarDictionary dict(message);
    std::string type = dict.Get("type").AsString();
    pp::Var data = dict.Get("data");

    if (type == "pause") {
      int pause = data.AsBool();
      mpv_set_property(mpv_, "pause", MPV_FORMAT_FLAG, &pause);
    } else if (type == "seek") {
      double time = data.AsDouble();
      mpv_set_property(mpv_, "time-pos", MPV_FORMAT_DOUBLE, &time);
    } else if (type == "volume") {
      pp::VarDictionary data_dict(data);
      double volume = data_dict.Get("volume").AsDouble();
      int mute = data_dict.Get("mute").AsBool();
      mpv_set_property(mpv_, "volume", MPV_FORMAT_DOUBLE, &volume);
      mpv_set_property(mpv_, "mute", MPV_FORMAT_FLAG, &mute);
    } else if (type == "keypress") {
      std::string key = data.AsString();
      const char* cmd[] = {"keypress", key.c_str(), NULL};
      mpv_command(mpv_, cmd);
    } else if (type == "deinterlace") {
      int deinterlace = data.AsBool();
      mpv_set_property(mpv_, "deinterlace", MPV_FORMAT_FLAG, &deinterlace);
    } else if (type == "sid") {
      pp::VarDictionary data_dict(data);
      int64_t id = data_dict.Get("id").AsInt();
      Var path = data_dict.Get("path");
      if (path.is_null()) {
        mpv_set_property(mpv_, "sid", MPV_FORMAT_INT64, &id);
      } else {
        std::string str_id = std::to_string(id);
        const char* cmd_remove[] = {"sub-remove", str_id.c_str(), NULL};
        mpv_command(mpv_, cmd_remove);
        const char* cmd_add[] = {"sub-add", path.AsString().c_str(), NULL};
        mpv_command(mpv_, cmd_add);
      }
    } else if (type == "frame-step" || type == "frame-back-step") {
      const char* cmd[] = {type.c_str(), NULL};
      mpv_command(mpv_, cmd);
    }
  }

 private:
  static void* GetProcAddressMPV(void* fn_ctx, const char* name) {
    auto search = GL_CALLBACKS.find(name);
    if (search == GL_CALLBACKS.end()) {
      fprintf(stderr, "FIXME: missed GL function %s\n", name);
      return NULL;
    } else {
      return search->second;
    }
  }

  void PostData(const char* type, const Var& data) {
    pp::VarDictionary dict;
    dict.Set(Var("type"), Var(type));
    dict.Set(Var("data"), data);
    PostMessage(dict);
  }

  void HandleMPVEvents(int32_t) {
    for (;;) {
      mpv_event* event = mpv_wait_event(mpv_, 0);
      // printf("@@@ EVENT %d\n", event->event_id);
      if (event->event_id == MPV_EVENT_NONE) break;
      if (event->event_id == MPV_EVENT_PROPERTY_CHANGE) {
        HandleMPVPropertyChange(static_cast<mpv_event_property*>(event->data));
      }
    }
  }

  void HandleMPVPropertyChange(mpv_event_property* prop) {
    if (prop->format == MPV_FORMAT_FLAG) {
      bool value = *static_cast<int*>(prop->data);
      PostData(prop->name, Var(value));
    } else if (prop->format == MPV_FORMAT_INT64) {
      int64_t value = *static_cast<int64_t*>(prop->data);
      PostData(prop->name, Var(static_cast<int32_t>(value)));
    } else if (prop->format == MPV_FORMAT_DOUBLE) {
      double value = *static_cast<double*>(prop->data);
      PostData(prop->name, Var(value));
    }
  }

  static void HandleMPVWakeup(void* ctx) {
    BoramInstance* b = static_cast<BoramInstance*>(ctx);
    pp::Module::Get()->core()->CallOnMainThread(
        0, b->callback_factory_.NewCallback(&BoramInstance::HandleMPVEvents));
  }

  static void HandleMPVUpdate(void* ctx) {
    // printf("@@@ UPDATE\n");
    BoramInstance* b = static_cast<BoramInstance*>(ctx);
    pp::Module::Get()->core()->CallOnMainThread(
        0, b->callback_factory_.NewCallback(&BoramInstance::OnGetFrame));
  }

  bool InitGL() {
    if (!glInitializePPAPI(pp::Module::Get()->get_browser_interface()))
      DIE("unable to initialize GL PPAPI");

    const int32_t attrib_list[] = {
      PP_GRAPHICS3DATTRIB_ALPHA_SIZE, 8,
      PP_GRAPHICS3DATTRIB_DEPTH_SIZE, 24,
      PP_GRAPHICS3DATTRIB_NONE
    };

    context_ = pp::Graphics3D(this, attrib_list);
    if (!BindGraphics(context_))
      DIE("unable to bind 3d context");

    return true;
  }

  bool InitMPV() {
    setlocale(LC_NUMERIC, "C");
    mpv_ = mpv_create();
    if (!mpv_)
      DIE("context init failed");

    char* verbose = getenv("BORAM_VERBOSE");
    if (verbose && strlen(verbose))
      mpv_set_option_string(mpv_, "terminal", "yes");

    if (mpv_initialize(mpv_) < 0)
      DIE("mpv init failed");

    mpv_gl_ = static_cast<mpv_opengl_cb_context*>(
        mpv_get_sub_api(mpv_, MPV_SUB_API_OPENGL_CB));
    if (!mpv_gl_)
      DIE("failed to create mpv GL API handle");

    glSetCurrentContextPPAPI(context_.pp_resource());
    if (mpv_opengl_cb_init_gl(mpv_gl_, NULL, GetProcAddressMPV, NULL) < 0)
      DIE("failed to initialize mpv GL context");

    if (mpv_set_option_string(mpv_, "vo", "opengl-cb") < 0)
      DIE("failed to set VO");

    mpv_set_option_string(mpv_, "vf-defaults", "yadif=interlaced-only=no");
    mpv_set_option_string(mpv_, "stop-playback-on-init-failure", "no");
    mpv_set_option_string(mpv_, "input-default-bindings", "yes");
    mpv_set_option_string(mpv_, "audio-file-auto", "no");
    mpv_set_option_string(mpv_, "sub-auto", "no");
    mpv_set_option_string(mpv_, "volume-max", "100");
    mpv_set_option_string(mpv_, "keep-open", "yes");
    mpv_set_option_string(mpv_, "osd-bar", "no");
    mpv_set_option_string(mpv_, "pause", "yes");
    const char* cmd[] = {"loadfile", src_, NULL};
    mpv_command(mpv_, cmd);

    mpv_observe_property(mpv_, 0, "sid", MPV_FORMAT_INT64);
    mpv_observe_property(mpv_, 0, "pause", MPV_FORMAT_FLAG);
    mpv_observe_property(mpv_, 0, "time-pos", MPV_FORMAT_DOUBLE);
    mpv_observe_property(mpv_, 0, "mute", MPV_FORMAT_FLAG);
    mpv_observe_property(mpv_, 0, "volume", MPV_FORMAT_DOUBLE);
    mpv_observe_property(mpv_, 0, "eof-reached", MPV_FORMAT_FLAG);
    mpv_observe_property(mpv_, 0, "deinterlace", MPV_FORMAT_FLAG);
    mpv_set_wakeup_callback(mpv_, HandleMPVWakeup, this);
    mpv_opengl_cb_set_update_callback(mpv_gl_, HandleMPVUpdate, this);

    return true;
  }

  void OnGetFrame(int32_t) {
    if (!gl_ready_)
      return;

    render_mutex_.lock();
    if (is_painting_) {
      needs_paint_ = true;
      render_mutex_.unlock();
    } else {
      is_painting_ = true;
      needs_paint_ = false;
      render_mutex_.unlock();
      Render();
    }
  }

  void Render() {
    // XXX(Kagami): Race condition if another plugin sets different
    // context in between calls?
    glSetCurrentContextPPAPI(context_.pp_resource());
    mpv_opengl_cb_draw(mpv_gl_, 0, width_, -height_);
    context_.SwapBuffers(
        callback_factory_.NewCallback(&BoramInstance::PaintFinished));
  }

  void PaintFinished(int32_t) {
    render_mutex_.lock();
    is_painting_ = false;
    render_mutex_.unlock();
    if (needs_paint_)
      OnGetFrame(0);
  }

  pp::CompletionCallbackFactory<BoramInstance> callback_factory_;
  pp::Graphics3D context_;
  mpv_handle* mpv_;
  mpv_opengl_cb_context* mpv_gl_;
  char* src_;
  int32_t width_;
  int32_t height_;
  bool gl_ready_;
  bool is_painting_;
  bool needs_paint_;
  std::mutex render_mutex_;
};

class BoramModule : public pp::Module {
 public:
  BoramModule() : pp::Module() {}
  virtual ~BoramModule() {}

  virtual pp::Instance* CreateInstance(PP_Instance instance) {
    return new BoramInstance(instance);
  }
};

namespace pp {
Module* CreateModule() {
  return new BoramModule();
}
}  // namespace pp
