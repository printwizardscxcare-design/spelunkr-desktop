using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Automation;

// Reads only the Windows Live Captions text element. No audio or transcript is saved.
internal static class CaptionReader
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern IntPtr FindWindow(string name, string title);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll")] static extern int SetWindowLong(IntPtr window, int index, int value);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
    static volatile bool running = true;
    static readonly JavaScriptSerializer json = new JavaScriptSerializer();

    static void Send(string type, string text)
    {
        Console.WriteLine(json.Serialize(new { type = type, text = text }));
        Console.Out.Flush();
    }

    [STAThread]
    static int Main()
    {
        Console.OutputEncoding = new UTF8Encoding(false);
        string executable = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "System32", "LiveCaptions.exe");
        IntPtr window = IntPtr.Zero;
        int originalStyle = 0;
        bool hidden = false, originallyMinimized = false, startedHere = false, prepared = false;
        try
        {
            if (!File.Exists(executable)) { Send("error", "Windows Live Captions requires Windows 11 22H2 or later."); return 1; }
            // EOF also stops the bridge if the desktop app exits or crashes.
            Thread input = new Thread(delegate() {
                try { while (Console.ReadLine() != null) { running = false; break; } }
                finally { running = false; }
            });
            input.IsBackground = true;
            input.Start();
            window = FindWindow("LiveCaptionsDesktopWindow", null);
            if (window == IntPtr.Zero)
            {
                Process.Start(new ProcessStartInfo(executable) { UseShellExecute = true });
                startedHere = true;
            }
            Send("status", "Waiting for Windows Live Captions. Complete any first-time Windows setup.");
            string lastText = null;
            AutomationElement textBlock = null;
            DateTime deadline = DateTime.UtcNow.AddSeconds(60);
            while (running)
            {
                if (window == IntPtr.Zero) window = FindWindow("LiveCaptionsDesktopWindow", null);
                if (window == IntPtr.Zero)
                {
                    if (DateTime.UtcNow > deadline) { Send("error", "Windows Live Captions did not open. Use Captions > Open Windows caption window to complete setup."); return 2; }
                    Thread.Sleep(250); continue;
                }
                if (!IsWindow(window)) { Send("error", "Windows Live Captions was closed. Turn in-app captions on again to reconnect."); return 3; }
                uint processId;
                GetWindowThreadProcessId(window, out processId);
                using (Process process = Process.GetProcessById((int)processId))
                {
                    if (!String.Equals(process.MainModule.FileName, executable, StringComparison.OrdinalIgnoreCase))
                        throw new InvalidOperationException("The caption window is not the Windows Live Captions application.");
                }
                if (!prepared)
                {
                    originalStyle = GetWindowLong(window, -20);
                    originallyMinimized = IsIconic(window);
                    // Windows may reopen captions minimized after an earlier session.
                    // Restore once so its accessible text control is initialized.
                    ShowWindow(window, 9);
                    prepared = true;
                }
                try
                {
                    if (textBlock == null)
                    {
                        AutomationElement root = AutomationElement.FromHandle(window);
                        textBlock = root.FindFirst(TreeScope.Descendants, new PropertyCondition(AutomationElement.AutomationIdProperty, "CaptionsTextBlock"));
                    }
                    // Keep setup visible until Windows has created its actual captions control.
                    if (textBlock == null)
                    {
                        if (DateTime.UtcNow > deadline) { Send("error", "Caption text is unavailable. Complete Windows captions setup or use the native caption window."); return 4; }
                        Thread.Sleep(300); continue;
                    }
                    string text = textBlock.Current.Name ?? "";
                    if (!hidden)
                    {
                        SetWindowLong(window, -20, originalStyle | 0x00000080);
                        ShowWindow(window, 6);
                        hidden = true;
                        Send("status", "Connected to Windows Live Captions");
                    }
                    if (text != lastText)
                    {
                        if (text.Length > 8192) text = text.Substring(text.Length - 8192);
                        Send("caption", text);
                        lastText = text;
                    }
                }
                catch (ElementNotAvailableException) { textBlock = null; }
                Thread.Sleep(150);
            }
            return 0;
        }
        catch (Exception error) { Send("error", "Could not read Windows captions: " + error.Message); return 5; }
        finally
        {
            if (window != IntPtr.Zero && IsWindow(window))
            {
                if (hidden) SetWindowLong(window, -20, originalStyle);
                if (startedHere) PostMessage(window, 0x0010, IntPtr.Zero, IntPtr.Zero);
                else if (hidden) ShowWindow(window, originallyMinimized ? 6 : 9);
            }
        }
    }
}
