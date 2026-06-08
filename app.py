#!/usr/bin/env python3
"""DARWIN - Evolutionary Tournament Trading Agent.
Entry point for running locally.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent.darwin import main

if __name__ == "__main__":
    main()
