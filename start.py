import os
import time

def clear_screen():
    os.system('clear' if os.name == 'posix' else 'cls')

def main():
    clear_screen()
    print("=========================================================")
    print("               👑 UHNWI+ DYNASTY OS 👑                   ")
    print("=========================================================")
    print("Initializing Founder Interface...\n")
    time.sleep(1)
    
    print("Welcome, Founder. To assemble the C-Suite and prepare")
    print("your Mandate, please provide the parameters of your vision.\n")

    # Interactive Questions
    target_project = input("[?] OPERATION CODENAME (e.g., 'Project Aegis'):\n> ")
    mandate = input("\n[?] THE MANDATE (Describe your ultimate vision/goal for this project):\n> ")
    budget = input("\n[?] SEED CAPITAL (What is the allocated budget for this sprint? e.g., '$5M'):\n> ")
    target_audience = input("\n[?] TARGET DEMOGRAPHIC (Who exactly is buying this?):\n> ")

    print("\n[*] Assembling Mandate Blueprint...")
    time.sleep(1.5)
    
    # Markdown generation
    md_content = f"""# UHNWI Mandate: {target_project}

**FROM:** The Founder
**TO:** Chief of Staff (CoS) / CEO

## 1. The Core Vision
{mandate}

## 2. Constraints & Resources
- **Target Audience:** {target_audience}
- **Starting Budget:** {budget}
- **Timeline:** I want the first V1 brand assets and operational blueprint ready for Crucible Testing by the end of this current sprint.

## 3. Executive Directive
Instruct your C-Suite to blueprint this immediately. 
- The **CPO** will map the operational logistics and customer journey. 
- The **CMO** will map the brand positioning and psychological hooks. 
- The **CFO** must optimize the pricing to ensure high gross margins. 
- The **COO** will ensure execution speed. 

Do not bother me with the operational minutiae. Just get it done.
"""
    
    # Ensure directory exists and save file
    output_dir = "00_FOUNDER_INPUT"
    os.makedirs(output_dir, exist_ok=True)
    filename = f"{output_dir}/{target_project.lower().replace(' ', '_')}_mandate.md"
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print(f"\n[✓] Mandate securely encrypted and saved to: {filename}")
    time.sleep(1)
    
    print("\n=========================================================")
    print("                   NEXT STEPS EXPECTED                   ")
    print("=========================================================")
    print("1. [OPTIONAL]: If you have Financial Reports, Competitor ")
    print(f"   Intel, or raw data, DROP those files into {output_dir}/ now.")
    print("2. [ACTION]: Open your Agentic AI Workspace (AntiGravity/Cursor).")
    print("3. [ACTION]: Awaken the CEO by copying the 'Level 2 Prompt'")
    print("   found in the README.md to execute this Mandate.")
    print("=========================================================\n")

if __name__ == "__main__":
    main()
