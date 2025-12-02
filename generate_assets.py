import os
from PIL import Image, ImageDraw, ImageEnhance, ImageOps
import random

# Ensure directory exists
output_dir = "apps/web/public/assets/items"
os.makedirs(output_dir, exist_ok=True)

def save_image(img, name):
    img.save(os.path.join(output_dir, f"{name}.png"))
    print(f"Generated {name}.png")

# Load existing images
try:
    mushroom_blue = Image.open(os.path.join(output_dir, "mushroom_blue.png")).convert("RGBA")
    stone = Image.open(os.path.join(output_dir, "stone.png")).convert("RGBA")
    wood = Image.open(os.path.join(output_dir, "wood.png")).convert("RGBA")
except FileNotFoundError:
    print("Error: Base images not found. Make sure previous assets are generated.")
    exit(1)

# 1. Mushroom Brown (Hue shift Blue Mushroom)
# Simple hue shift by separating channels
r, g, b, a = mushroom_blue.split()
# Brown is reddish-orange. Blue is... blue.
# Let's just colorize it brown.
mushroom_gray = ImageOps.grayscale(mushroom_blue)
mushroom_brown = ImageOps.colorize(mushroom_gray, "#5D4037", "#D7CCC8") # Dark brown to light brown
mushroom_brown.putalpha(a)
save_image(mushroom_brown, "mushroom_brown")

# 2. Stone Dark (Darken Stone)
enhancer = ImageEnhance.Brightness(stone)
stone_dark = enhancer.enhance(0.6)
save_image(stone_dark, "stone_dark")

# 3. Pebble (Resize Stone)
pebble = stone.resize((20, 20), resample=Image.NEAREST)
pebble_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
pebble_img.paste(pebble, (6, 6))
save_image(pebble_img, "pebble")

# 4. Plank (Modify Wood)
# Create a plank texture
plank = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(plank)
draw.rectangle([4, 8, 28, 24], fill="#DEB887", outline="#8B4513") # Light wood color
# Add some lines
draw.line([8, 12, 24, 12], fill="#8B4513")
draw.line([6, 18, 26, 18], fill="#8B4513")
save_image(plank, "plank")

# 5. Coin (Draw from scratch)
coin = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(coin)
draw.ellipse([6, 6, 26, 26], fill="#FFD700", outline="#DAA520") # Gold
draw.text((12, 8), "$", fill="#DAA520")
save_image(coin, "coin")

# 6. Grass (Draw from scratch)
grass = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(grass)
for _ in range(20):
    x = random.randint(4, 28)
    y = random.randint(10, 28)
    h = random.randint(4, 10)
    draw.line([x, y, x, y-h], fill="#32CD32", width=1)
save_image(grass, "grass")

# 7. Water (Draw from scratch)
water = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(water)
draw.ellipse([4, 8, 28, 24], fill="#87CEEB", outline="#4682B4")
draw.arc([8, 12, 24, 20], 0, 180, fill="#FFFFFF")
save_image(water, "water")

# 8. Dust (Noise)
dust = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(dust)
for _ in range(30):
    x = random.randint(8, 24)
    y = random.randint(8, 24)
    c = random.randint(150, 200)
    draw.point([x, y], fill=(c, c, c, 255))
save_image(dust, "dust")

# 9. Log (Draw from scratch)
log = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(log)
draw.rectangle([8, 4, 24, 28], fill="#8B4513", outline="#5D4037")
# Rings
draw.ellipse([10, 6, 22, 10], fill="#DEB887", outline="#5D4037")
save_image(log, "log")

print("All assets generated.")
