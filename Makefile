.PHONY: help run-csuite run-market run-audit run-all daemon

help:
	@echo "UHNWI+ Dynasty OS - Automation Make Commands"
	@echo "--------------------------------------------"
	@echo "make run-csuite : Run the Company execution layer"
	@echo "make run-market : Run the Market crucible layer"
	@echo "make run-audit  : Run the Shield audit layer"
	@echo "make run-all    : Run the full pipeline synchronously"
	@echo "make daemon     : Run the Python orchestrator in the background (AntiGravity mode)"

run-csuite:
	python3 system_tools/orchestrator.py --phase csuite

run-market:
	python3 system_tools/orchestrator.py --phase market

run-audit:
	python3 system_tools/orchestrator.py --phase audit

run-all:
	python3 system_tools/orchestrator.py --phase all

daemon:
	nohup python3 system_tools/orchestrator.py --daemon > system_tools/os_daemon.log 2>&1 &
	@echo "Dynasty OS daemon started in the background. Logs routing to system_tools/os_daemon.log"
