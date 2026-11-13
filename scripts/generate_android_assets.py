import os
from PIL import Image, ImageDraw

def create_android_assets():
    source_icon_path = 'frontend/public/images/tablemint_icon.png'
    res_dir = 'frontend/android/app/src/main/res'
    bg_color = (9, 43, 26) # #092B1A

    if not os.path.exists(source_icon_path):
        raise FileNotFoundError(f"Source icon not found at {source_icon_path}")

    src_img = Image.open(source_icon_path).convert('RGBA')

    # 1. Update ic_launcher_background.xml to match brand color #092B1A
    bg_xml_path = os.path.join(res_dir, 'values', 'ic_launcher_background.xml')
    os.makedirs(os.path.dirname(bg_xml_path), exist_ok=True)
    with open(bg_xml_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n')
        f.write('<resources>\n')
        f.write('    <color name="ic_launcher_background">#092B1A</color>\n')
        f.write('</resources>\n')
    print("Updated ic_launcher_background.xml -> #092B1A")

    # 2. Standard and Adaptive Launcher Icons
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432)
    }

    for folder, (std_size, fg_size) in densities.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # Standard icon (square / rounded by OS)
        std_icon = src_img.resize((std_size, std_size), Image.Resampling.LANCZOS)
        std_icon.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')

        # Round icon (circular mask)
        mask = Image.new('L', (std_size, std_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, std_size, std_size), fill=255)
        round_icon = Image.new('RGBA', (std_size, std_size), (0, 0, 0, 0))
        round_icon.paste(std_icon, (0, 0), mask=mask)
        round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')

        # Adaptive icon foreground (centered within 72dp safe zone of 108dp grid = ~66% scale)
        fg_icon_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        inner_size = int(fg_size * 0.70)
        inner_icon = src_img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (fg_size - inner_size) // 2
        fg_icon_canvas.paste(inner_icon, (offset, offset))
        fg_icon_canvas.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')

        print(f"Generated icons for {folder}: {std_size}x{std_size}, fg: {fg_size}x{fg_size}")

    # 3. Splash Screens
    splash_targets = {
        'drawable/splash.png': (480, 320),
        'drawable-port-mdpi/splash.png': (320, 480),
        'drawable-port-hdpi/splash.png': (480, 800),
        'drawable-port-xhdpi/splash.png': (720, 1280),
        'drawable-port-xxhdpi/splash.png': (960, 1600),
        'drawable-port-xxxhdpi/splash.png': (1280, 1920),
        'drawable-land-mdpi/splash.png': (480, 320),
        'drawable-land-hdpi/splash.png': (800, 480),
        'drawable-land-xhdpi/splash.png': (1280, 720),
        'drawable-land-xxhdpi/splash.png': (1600, 960),
        'drawable-land-xxxhdpi/splash.png': (1920, 1280)
    }

    for rel_path, (w, h) in splash_targets.items():
        full_path = os.path.join(res_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        splash_canvas = Image.new('RGBA', (w, h), (*bg_color, 255))

        # Scale logo to ~36% of the smallest screen dimension
        min_dim = min(w, h)
        logo_dim = max(80, int(min_dim * 0.38))
        scaled_logo = src_img.resize((logo_dim, logo_dim), Image.Resampling.LANCZOS)

        pos_x = (w - logo_dim) // 2
        pos_y = (h - logo_dim) // 2
        splash_canvas.paste(scaled_logo, (pos_x, pos_y), mask=scaled_logo if scaled_logo.mode == 'RGBA' else None)
        splash_canvas.convert('RGB').save(full_path, 'PNG')
        print(f"Generated splash screen {rel_path}: {w}x{h}")

    print("Successfully generated all TableMint Android icons & splash screens!")

if __name__ == '__main__':
    create_android_assets()

