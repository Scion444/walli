use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, RunEvent, WindowEvent,
};
use tauri_plugin_shell::ShellExt;

// Holds the sidecar child process so we can kill it on exit
struct Backend(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Backend(Mutex::new(None)))
        .setup(|app| {
            // ── Spawn the Python backend sidecar ─────────────────────
            let sidecar = app.shell().sidecar("backend").expect("failed to locate backend sidecar");
            let (_, child) = sidecar.spawn().expect("failed to spawn backend sidecar");
            *app.state::<Backend>().0.lock().unwrap() = Some(child);

            // ── System-tray icon + menu ──────────────────────────────
            let show = MenuItem::with_id(app, "show", "Show Walli", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::with_id("walli-tray")
                .icon(app.default_window_icon().cloned().expect("no window icon"))
                .tooltip("Walli — Wallpaper Manager")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        // Kill the backend sidecar before exiting
                        if let Some(child) = app.state::<Backend>().0.lock().unwrap().take() {
                            let _ = child.kill();
                        }
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                        if let Some(w) = tray.app_handle().get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            // Intercept the window close button → hide to tray instead of quitting
            RunEvent::WindowEvent {
                event: WindowEvent::CloseRequested { api, .. },
                label,
                ..
            } if label == "main" => {
                api.prevent_close();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }
            // When the app is truly exiting, kill the backend
            RunEvent::Exit => {
                if let Some(child) = app.state::<Backend>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
            _ => {}
        });
}
