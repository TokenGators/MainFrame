#!/usr/bin/env python3
"""Setup script for The Vault project."""

import os

def setup_project():
    """Initialize the project by creating directories and database."""
    # Create data and vault directories
    os.makedirs('data', exist_ok=True)
    os.makedirs('vault', exist_ok=True)
    
    print("✅ Project setup complete!")
    print(f"📁 Data directory: {os.path.abspath('data')}")
    print(f"📁 Vault directory: {os.path.abspath('vault')}")

if __name__ == '__main__':
    setup_project()