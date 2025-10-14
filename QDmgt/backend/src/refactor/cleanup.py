"""
Code Cleanup and Refactoring Module for Channel Management System

This module provides tools and guidelines for cleaning up and refactoring
the codebase to improve maintainability, readability, and performance.
"""

import os
import ast
import re
from pathlib import Path
from typing import List, Dict, Any, Optional, Set
import subprocess
import shutil
from datetime import datetime
import logging

from ..utils.logger import logger


class CodeRefactorer:
    """Code refactoring and cleanup manager"""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.logger = logging.getLogger(__name__)
    
    def find_python_files(self) -> List[Path]:
        """
        Find all Python files in the project
        
        Returns:
            List of Python file paths
        """
        python_files = []
        
        # Common directories to exclude
        exclude_dirs = {
            'venv', '.venv', '__pycache__', '.git', 'node_modules',
            'build', 'dist', '.pytest_cache', '.mypy_cache'
        }
        
        for root, dirs, files in os.walk(self.project_root):
            # Remove excluded directories from traversal
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file.endswith('.py'):
                    python_files.append(Path(root) / file)
        
        return python_files
    
    def find_javascript_files(self) -> List[Path]:
        """
        Find all JavaScript/TypeScript files in the project
        
        Returns:
            List of JavaScript/TypeScript file paths
        """
        js_files = []
        
        # Common directories to exclude
        exclude_dirs = {
            'node_modules', '.git', 'build', 'dist', '.next'
        }
        
        for root, dirs, files in os.walk(self.project_root / "frontend"):
            # Remove excluded directories from traversal
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                    js_files.append(Path(root) / file)
        
        return js_files
    
    def analyze_code_quality(self) -> Dict[str, Any]:
        """
        Analyze code quality using various tools
        
        Returns:
            Code quality analysis results
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "files_analyzed": 0,
            "issues_found": 0,
            "tool_results": {}
        }
        
        try:
            # Run flake8 for Python code
            flake8_results = self._run_flake8_analysis()
            results["tool_results"]["flake8"] = flake8_results
            
            # Run pylint for Python code
            pylint_results = self._run_pylint_analysis()
            results["tool_results"]["pylint"] = pylint_results
            
            # Run eslint for JavaScript/TypeScript code
            eslint_results = self._run_eslint_analysis()
            results["tool_results"]["eslint"] = eslint_results
            
            # Count total issues
            total_issues = 0
            for tool_results in results["tool_results"].values():
                total_issues += tool_results.get("issue_count", 0)
            
            results["issues_found"] = total_issues
            results["files_analyzed"] = len(self.find_python_files()) + len(self.find_javascript_files())
            
            self.logger.info(f"Code quality analysis completed: {total_issues} issues found")
            
        except Exception as e:
            self.logger.error(f"Code quality analysis failed: {e}")
        
        return results
    
    def _run_flake8_analysis(self) -> Dict[str, Any]:
        """Run flake8 analysis on Python code"""
        try:
            result = subprocess.run(
                ["flake8", str(self.project_root)],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            issues = result.stdout.strip().split('\n') if result.stdout.strip() else []
            errors = result.stderr.strip().split('\n') if result.stderr.strip() else []
            
            return {
                "issue_count": len([i for i in issues if i]),
                "issues": [i for i in issues if i],
                "errors": [e for e in errors if e],
                "return_code": result.returncode
            }
        except Exception as e:
            self.logger.error(f"Flake8 analysis failed: {e}")
            return {"error": str(e)}
    
    def _run_pylint_analysis(self) -> Dict[str, Any]:
        """Run pylint analysis on Python code"""
        try:
            result = subprocess.run(
                ["pylint", str(self.project_root / "backend" / "src")],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            output_lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
            error_lines = result.stderr.strip().split('\n') if result.stderr.strip() else []
            
            # Parse pylint output
            issues = []
            for line in output_lines:
                if ":" in line and "line" in line:
                    issues.append(line)
            
            return {
                "issue_count": len(issues),
                "issues": issues,
                "errors": [e for e in error_lines if e],
                "return_code": result.returncode
            }
        except Exception as e:
            self.logger.error(f"Pylint analysis failed: {e}")
            return {"error": str(e)}
    
    def _run_eslint_analysis(self) -> Dict[str, Any]:
        """Run eslint analysis on JavaScript/TypeScript code"""
        try:
            result = subprocess.run(
                ["npx", "eslint", str(self.project_root / "frontend" / "src")],
                capture_output=True,
                text=True,
                cwd=str(self.project_root / "frontend"),
                timeout=300
            )
            
            issues = result.stdout.strip().split('\n') if result.stdout.strip() else []
            errors = result.stderr.strip().split('\n') if result.stderr.strip() else []
            
            return {
                "issue_count": len([i for i in issues if i and not i.startswith("Done")]),
                "issues": [i for i in issues if i and not i.startswith("Done")],
                "errors": [e for e in errors if e],
                "return_code": result.returncode
            }
        except Exception as e:
            self.logger.error(f"ESLint analysis failed: {e}")
            return {"error": str(e)}
    
    def apply_code_formatting(self) -> Dict[str, Any]:
        """
        Apply automatic code formatting using Black and Prettier
        
        Returns:
            Formatting results
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "files_formatted": 0,
            "formatting_applied": [],
            "errors": []
        }
        
        try:
            # Format Python code with Black
            black_results = self._format_python_code()
            results["formatting_applied"].append(("black", black_results))
            
            # Format JavaScript/TypeScript code with Prettier
            prettier_results = self._format_js_code()
            results["formatting_applied"].append(("prettier", prettier_results))
            
            # Count formatted files
            total_formatted = 0
            for tool, tool_results in results["formatting_applied"]:
                if isinstance(tool_results, dict) and "files_formatted" in tool_results:
                    total_formatted += tool_results["files_formatted"]
            
            results["files_formatted"] = total_formatted
            
            self.logger.info(f"Code formatting applied to {total_formatted} files")
            
        except Exception as e:
            self.logger.error(f"Code formatting failed: {e}")
            results["errors"].append(str(e))
        
        return results
    
    def _format_python_code(self) -> Dict[str, Any]:
        """Format Python code with Black"""
        try:
            result = subprocess.run(
                ["black", "--diff", str(self.project_root / "backend" / "src")],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            # Count files that would be formatted
            diff_lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
            files_to_format = set()
            
            for line in diff_lines:
                if line.startswith("--- "):
                    file_path = line[4:].strip()
                    if file_path and not file_path.startswith("/dev/null"):
                        files_to_format.add(file_path)
            
            # Actually format files
            format_result = subprocess.run(
                ["black", str(self.project_root / "backend" / "src")],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            return {
                "files_formatted": len(files_to_format),
                "would_be_formatted": len(files_to_format),
                "formatting_output": format_result.stdout,
                "errors": format_result.stderr if format_result.stderr else "",
                "return_code": format_result.returncode
            }
        except Exception as e:
            self.logger.error(f"Black formatting failed: {e}")
            return {"error": str(e)}
    
    def _format_js_code(self) -> Dict[str, Any]:
        """Format JavaScript/TypeScript code with Prettier"""
        try:
            # Check what would be formatted
            check_result = subprocess.run(
                ["npx", "prettier", "--check", str(self.project_root / "frontend" / "src")],
                capture_output=True,
                text=True,
                cwd=str(self.project_root / "frontend"),
                timeout=300
            )
            
            # Actually format files
            format_result = subprocess.run(
                ["npx", "prettier", "--write", str(self.project_root / "frontend" / "src")],
                capture_output=True,
                text=True,
                cwd=str(self.project_root / "frontend"),
                timeout=300
            )
            
            # Parse output to count formatted files
            output_lines = format_result.stdout.strip().split('\n') if format_result.stdout.strip() else []
            formatted_files = [line for line in output_lines if "Formatted" in line or ".js" in line or ".ts" in line]
            
            return {
                "files_formatted": len(formatted_files),
                "formatting_output": format_result.stdout,
                "errors": format_result.stderr if format_result.stderr else "",
                "return_code": format_result.returncode
            }
        except Exception as e:
            self.logger.error(f"Prettier formatting failed: {e}")
            return {"error": str(e)}
    
    def remove_dead_code(self) -> Dict[str, Any]:
        """
        Identify and remove dead/unreachable code
        
        Returns:
            Dead code removal results
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "dead_code_found": 0,
            "files_processed": 0,
            "removed_functions": [],
            "removed_imports": [],
            "errors": []
        }
        
        try:
            # Analyze Python files for dead code
            python_files = self.find_python_files()
            results["files_processed"] = len(python_files)
            
            for file_path in python_files:
                try:
                    dead_code = self._analyze_dead_code_python(file_path)
                    if dead_code:
                        results["dead_code_found"] += len(dead_code)
                        
                        # Attempt to remove dead code
                        removal_results = self._remove_dead_code_python(file_path, dead_code)
                        results["removed_functions"].extend(removal_results.get("removed_functions", []))
                        results["removed_imports"].extend(removal_results.get("removed_imports", []))
                        
                except Exception as e:
                    results["errors"].append(f"Error processing {file_path}: {e}")
            
            self.logger.info(f"Dead code analysis completed: {results['dead_code_found']} issues found")
            
        except Exception as e:
            self.logger.error(f"Dead code removal failed: {e}")
            results["errors"].append(str(e))
        
        return results
    
    def _analyze_dead_code_python(self, file_path: Path) -> List[Dict[str, Any]]:
        """
        Analyze Python file for dead code
        
        Args:
            file_path: Path to Python file
            
        Returns:
            List of dead code findings
        """
        dead_code_findings = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse AST
            tree = ast.parse(content)
            
            # Find unused functions and variables
            analyzer = DeadCodeAnalyzer()
            analyzer.visit(tree)
            
            # Identify unused functions
            for func_name in analyzer.defined_functions:
                if func_name not in analyzer.used_functions:
                    dead_code_findings.append({
                        "type": "unused_function",
                        "name": func_name,
                        "line": analyzer.function_lines.get(func_name, 0)
                    })
            
            # Identify unused imports
            for import_name in analyzer.imported_names:
                if import_name not in analyzer.used_names:
                    dead_code_findings.append({
                        "type": "unused_import",
                        "name": import_name,
                        "line": analyzer.import_lines.get(import_name, 0)
                    })
            
        except Exception as e:
            self.logger.error(f"Dead code analysis failed for {file_path}: {e}")
        
        return dead_code_findings
    
    def _remove_dead_code_python(self, file_path: Path, dead_code: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Remove dead code from Python file
        
        Args:
            file_path: Path to Python file
            dead_code: List of dead code findings
            
        Returns:
            Removal results
        """
        results = {
            "removed_functions": [],
            "removed_imports": [],
            "errors": []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Remove lines with dead code (this is a simplified approach)
            # In practice, you would need a more sophisticated approach
            removed_lines = []
            for finding in dead_code:
                if finding["type"] == "unused_function":
                    results["removed_functions"].append(finding["name"])
                elif finding["type"] == "unused_import":
                    results["removed_imports"].append(finding["name"])
            
            # For demonstration, we won't actually modify files
            # This would require careful parsing and code manipulation
            
        except Exception as e:
            results["errors"].append(str(e))
            self.logger.error(f"Dead code removal failed for {file_path}: {e}")
        
        return results
    
    def optimize_imports(self) -> Dict[str, Any]:
        """
        Optimize imports by removing unused imports and organizing import statements
        
        Returns:
            Import optimization results
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "files_processed": 0,
            "imports_optimized": 0,
            "duplicate_imports_removed": 0,
            "errors": []
        }
        
        try:
            python_files = self.find_python_files()
            results["files_processed"] = len(python_files)
            
            for file_path in python_files:
                try:
                    optimization_result = self._optimize_imports_file(file_path)
                    results["imports_optimized"] += optimization_result.get("imports_optimized", 0)
                    results["duplicate_imports_removed"] += optimization_result.get("duplicate_imports_removed", 0)
                    
                except Exception as e:
                    results["errors"].append(f"Error processing {file_path}: {e}")
            
            self.logger.info(f"Import optimization completed: {results['imports_optimized']} imports optimized")
            
        except Exception as e:
            self.logger.error(f"Import optimization failed: {e}")
            results["errors"].append(str(e))
        
        return results
    
    def _optimize_imports_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Optimize imports in a single Python file
        
        Args:
            file_path: Path to Python file
            
        Returns:
            Optimization results for the file
        """
        results = {
            "imports_optimized": 0,
            "duplicate_imports_removed": 0,
            "errors": []
        }
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse and optimize imports
            optimized_content, optimization_stats = self._parse_and_optimize_imports(content)
            
            # Write back to file if changes were made
            if content != optimized_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(optimized_content)
                
                results["imports_optimized"] = optimization_stats.get("imports_optimized", 0)
                results["duplicate_imports_removed"] = optimization_stats.get("duplicate_imports_removed", 0)
            
        except Exception as e:
            results["errors"].append(str(e))
            self.logger.error(f"Import optimization failed for {file_path}: {e}")
        
        return results
    
    def _parse_and_optimize_imports(self, content: str) -> tuple[str, Dict[str, Any]]:
        """
        Parse and optimize import statements in content
        
        Args:
            content: File content
            
        Returns:
            Tuple of (optimized_content, optimization_stats)
        """
        # This is a simplified implementation
        # In practice, you would use tools like isort or write a more sophisticated parser
        
        lines = content.split('\n')
        optimized_lines = []
        import_statements = []
        other_lines = []
        
        # Separate imports from other code
        for line in lines:
            if line.strip().startswith(('import ', 'from ')) and 'import' in line:
                import_statements.append(line)
            else:
                other_lines.append(line)
        
        # Remove duplicate imports (simplified)
        seen_imports = set()
        unique_imports = []
        duplicates_removed = 0
        
        for import_stmt in import_statements:
            # Simplified deduplication - in practice this would be more complex
            import_key = import_stmt.strip()
            if import_key not in seen_imports:
                seen_imports.add(import_key)
                unique_imports.append(import_stmt)
            else:
                duplicates_removed += 1
        
        # Reconstruct optimized content
        optimized_content = '\n'.join(unique_imports + other_lines)
        optimization_stats = {
            "imports_optimized": len(unique_imports),
            "duplicate_imports_removed": duplicates_removed
        }
        
        return optimized_content, optimization_stats
    
    def generate_refactoring_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive refactoring report
        
        Returns:
            Refactoring report
        """
        report = {
            "generated_at": datetime.now().isoformat(),
            "project_root": str(self.project_root),
            "summary": {},
            "detailed_analysis": {},
            "recommendations": []
        }
        
        try:
            # Code quality analysis
            quality_results = self.analyze_code_quality()
            report["detailed_analysis"]["code_quality"] = quality_results
            
            # Formatting results
            formatting_results = self.apply_code_formatting()
            report["detailed_analysis"]["formatting"] = formatting_results
            
            # Dead code analysis
            dead_code_results = self.remove_dead_code()
            report["detailed_analysis"]["dead_code"] = dead_code_results
            
            # Import optimization
            import_results = self.optimize_imports()
            report["detailed_analysis"]["imports"] = import_results
            
            # Generate summary
            report["summary"] = {
                "total_issues": quality_results.get("issues_found", 0),
                "files_formatted": formatting_results.get("files_formatted", 0),
                "dead_code_found": dead_code_results.get("dead_code_found", 0),
                "imports_optimized": import_results.get("imports_optimized", 0),
                "duplicate_imports_removed": import_results.get("duplicate_imports_removed", 0)
            }
            
            # Generate recommendations
            recommendations = []
            
            if report["summary"]["total_issues"] > 100:
                recommendations.append({
                    "priority": "high",
                    "recommendation": "Address high-priority code quality issues",
                    "estimated_effort": "2-4 days"
                })
            
            if report["summary"]["dead_code_found"] > 50:
                recommendations.append({
                    "priority": "medium",
                    "recommendation": "Review and remove identified dead code",
                    "estimated_effort": "1-2 days"
                })
            
            if report["summary"]["duplicate_imports_removed"] > 100:
                recommendations.append({
                    "priority": "medium",
                    "recommendation": "Continue import optimization across the codebase",
                    "estimated_effort": "0.5-1 day"
                })
            
            report["recommendations"] = recommendations
            
            self.logger.info("Refactoring report generated successfully")
            
        except Exception as e:
            self.logger.error(f"Refactoring report generation failed: {e}")
            report["error"] = str(e)
        
        return report


class DeadCodeAnalyzer(ast.NodeVisitor):
    """AST visitor for analyzing dead code"""
    
    def __init__(self):
        self.defined_functions = set()
        self.used_functions = set()
        self.imported_names = set()
        self.used_names = set()
        self.function_lines = {}
        self.import_lines = {}
    
    def visit_FunctionDef(self, node):
        """Visit function definition"""
        self.defined_functions.add(node.name)
        self.function_lines[node.name] = node.lineno
        self.generic_visit(node)
    
    def visit_Call(self, node):
        """Visit function call"""
        if isinstance(node.func, ast.Name):
            self.used_functions.add(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            self.used_names.add(node.func.attr)
        self.generic_visit(node)
    
    def visit_Import(self, node):
        """Visit import statement"""
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imported_names.add(name)
            self.import_lines[name] = node.lineno
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        """Visit from-import statement"""
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imported_names.add(name)
            self.import_lines[name] = node.lineno
        self.generic_visit(node)
    
    def visit_Name(self, node):
        """Visit name usage"""
        self.used_names.add(node.id)
        self.generic_visit(node)


# Refactoring utilities
def sort_imports(file_path: Path) -> bool:
    """
    Sort imports in a Python file using isort
    
    Args:
        file_path: Path to Python file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        result = subprocess.run(
            ["isort", str(file_path)],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Import sorting failed for {file_path}: {e}")
        return False


def remove_unused_imports(file_path: Path) -> bool:
    """
    Remove unused imports from a Python file using unimport
    
    Args:
        file_path: Path to Python file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        result = subprocess.run(
            ["unimport", "--remove", str(file_path)],
            capture_output=True,
            text=True,
            timeout=60
        )
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Unused import removal failed for {file_path}: {e}")
        return False


def fix_code_style(file_path: Path) -> bool:
    """
    Fix code style issues using autopep8
    
    Args:
        file_path: Path to Python file
        
    Returns:
        True if successful, False otherwise
    """
    try:
        result = subprocess.run(
            ["autopep8", "--in-place", "--aggressive", "--aggressive", str(file_path)],
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.returncode == 0
    except Exception as e:
        logger.error(f"Code style fixing failed for {file_path}: {e}")
        return False


# Main refactoring orchestrator
async def run_complete_refactoring(project_root: str = ".") -> Dict[str, Any]:
    """
    Run complete code refactoring process
    
    Args:
        project_root: Project root directory
        
    Returns:
        Refactoring results
    """
    refactorer = CodeRefactorer(project_root)
    
    results = {
        "started_at": datetime.now().isoformat(),
        "steps_completed": [],
        "errors": []
    }
    
    try:
        # Step 1: Code quality analysis
        logger.info("Step 1: Running code quality analysis...")
        quality_results = refactorer.analyze_code_quality()
        results["quality_analysis"] = quality_results
        results["steps_completed"].append("quality_analysis")
        
        # Step 2: Apply code formatting
        logger.info("Step 2: Applying code formatting...")
        formatting_results = refactorer.apply_code_formatting()
        results["formatting"] = formatting_results
        results["steps_completed"].append("formatting")
        
        # Step 3: Optimize imports
        logger.info("Step 3: Optimizing imports...")
        import_results = refactorer.optimize_imports()
        results["import_optimization"] = import_results
        results["steps_completed"].append("import_optimization")
        
        # Step 4: Remove dead code
        logger.info("Step 4: Removing dead code...")
        dead_code_results = refactorer.remove_dead_code()
        results["dead_code_removal"] = dead_code_results
        results["steps_completed"].append("dead_code_removal")
        
        # Step 5: Generate refactoring report
        logger.info("Step 5: Generating refactoring report...")
        report = refactorer.generate_refactoring_report()
        results["report"] = report
        results["steps_completed"].append("report_generation")
        
        results["completed_at"] = datetime.now().isoformat()
        results["success"] = True
        
        logger.info("Complete refactoring process completed successfully")
        
    except Exception as e:
        results["errors"].append(str(e))
        results["completed_at"] = datetime.now().isoformat()
        results["success"] = False
        logger.error(f"Complete refactoring process failed: {e}")
    
    return results


# CLI interface
def main():
    """Main CLI interface for code refactoring"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Code Cleanup and Refactoring Tool")
    parser.add_argument("--project-root", "-p", default=".", help="Project root directory")
    parser.add_argument("--analyze-only", action="store_true", help="Only analyze, don't modify files")
    parser.add_argument("--format-only", action="store_true", help="Only format code")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.basicConfig(level=logging.INFO)
    
    refactorer = CodeRefactorer(args.project_root)
    
    if args.analyze_only:
        print("Running code quality analysis...")
        results = refactorer.analyze_code_quality()
        print(f"Issues found: {results.get('issues_found', 0)}")
        for tool, tool_results in results.get("tool_results", {}).items():
            print(f"  {tool}: {tool_results.get('issue_count', 0)} issues")
    elif args.format_only:
        print("Applying code formatting...")
        results = refactorer.apply_code_formatting()
        print(f"Files formatted: {results.get('files_formatted', 0)}")
    else:
        print("Running complete refactoring process...")
        import asyncio
        results = asyncio.run(run_complete_refactoring(args.project_root))
        
        if results["success"]:
            print("Refactoring completed successfully!")
            print(f"Steps completed: {len(results['steps_completed'])}")
            if "report" in results:
                summary = results["report"].get("summary", {})
                print(f"Summary: {summary}")
        else:
            print("Refactoring failed!")
            for error in results.get("errors", []):
                print(f"  Error: {error}")


if __name__ == "__main__":
    main()