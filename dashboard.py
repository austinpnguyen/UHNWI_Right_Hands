import streamlit as st
import os
import time

# UI Configurations
st.set_page_config(page_title="Dynasty OS Dashboard", page_icon="👑", layout="wide")

# Custom CSS for that dark, premium UHNWI aesthetic
st.markdown("""
    <style>
    .stApp {
        background-color: #0E1117;
        color: #FAFAFA;
    }
    h1, h2, h3 {
        color: #D4AF37 !important; /* Gold */
    }
    .stButton>button {
        width: 100%;
        background-color: #1E1E1E;
        color: #D4AF37;
        border: 1px solid #D4AF37;
        transition: 0.3s;
    }
    .stButton>button:hover {
        background-color: #D4AF37;
        color: #1E1E1E;
    }
    </style>
""", unsafe_allow_html=True)

st.title("👑 UHNWI+ Dynasty OS: Command Center")
st.markdown("*The Autonomous Executive Ecosystem for Ultra-High Net Worth Individuals.*")

# --- SIDEBAR ORCHESTRATION ---
st.sidebar.header("⚙️ System Control")
st.sidebar.markdown("---")

# Get mandates
input_dir = "00_FOUNDER_INPUT"
mandates = [f for f in os.listdir(input_dir) if f.endswith('.md')] if os.path.exists(input_dir) else []

selected_mandate = st.sidebar.selectbox("Active Mandate:", mandates if mandates else ["No mandates found"])

st.sidebar.markdown("### Execution Engine")

if st.sidebar.button("1. Awaken The Company (CEO)"):
    with st.spinner("Assembling C-Suite (CPO, CMO, CFO, COO)..."):
        time.sleep(1.5)
        st.sidebar.success("Master Plan V1 Synthesized & Pushed to Crucible!")

if st.sidebar.button("2. Run Market Crucible"):
    with st.spinner("Deploying Target Buyer & Competitor Simulators..."):
        time.sleep(1.5)
        st.sidebar.warning("Crucible Attack Complete. Brutal feedback logged.")

if st.sidebar.button("3. Deploy The Shield (Audit)"):
    with st.spinner("Auditor & CLO reviewing logs for Legal/OpSec risks..."):
        time.sleep(1.5)
        st.sidebar.error("Audit Complete. Final Verification Required by Founder.")

st.sidebar.markdown("---")
st.sidebar.info("Note: This is the GUI Interface. To fully automate API calls, configure your LLM tokens in the python backend.")


# --- MAIN DISPLAY AREA ---
col1, col2 = st.columns([1, 1])

def read_markdown_file(filepath):
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    return "File not found or not generated yet."

with col1:
    st.subheader("📥 Founder Input (The Mandate)")
    if selected_mandate and selected_mandate != "No mandates found":
        content = read_markdown_file(os.path.join(input_dir, selected_mandate))
        st.markdown(f"```markdown\n{content}\n```")
    else:
        st.info("Drop your mandate files into `00_FOUNDER_INPUT/` to see them here.")

with col2:
    st.subheader("🛡️ Live System Output")
    tab1, tab2 = st.tabs(["Master Plan (Crucible)", "Shield Audit Logs"])
    
    with tab1:
        st.markdown("**Latest C-Suite Output:**")
        # Attempt to load a sample master plan if it exists
        plan_path = "company_files/crucible_testing/master_plan_v1_Aegis.md"
        plan_content = read_markdown_file(plan_path)
        if plan_content != "File not found or not generated yet.":
            st.markdown(plan_content)
        else:
            st.code(plan_content)
            
    with tab2:
        st.markdown("**Latest Market & Legal Audit:**")
        st.info("No active logs detected in `company_files/feedback_logs/`. Run the Crucible pipeline to generate attacks.")

