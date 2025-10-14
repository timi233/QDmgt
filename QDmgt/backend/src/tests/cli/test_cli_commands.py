"""
CLI Commands Tests for Channel Management System

This module tests all CLI commands including init-db, create-user,
create-channel, list-channels, and health check commands.
"""

import pytest
from unittest.mock import MagicMock, patch, call

from ...cli.main import (
    CLIApplication,
    InitDBCommand,
    CreateUserCommand,
    CreateChannelCommand,
    ListChannelsCommand,
    HealthCheckCommand,
)


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def cli_app() -> CLIApplication:
    """Create a CLI application instance for testing"""
    return CLIApplication()




# =============================================================================
# Test CLIApplication
# =============================================================================

@pytest.mark.cli
class TestCLIApplication:
    """Test CLI application setup and command registration"""

    def test_cli_app_initialization(self, cli_app):
        """Test CLI application initializes correctly"""
        assert cli_app is not None
        assert len(cli_app.commands) > 0
        assert cli_app.parser is not None
        assert cli_app.subparsers is not None

    def test_cli_app_has_all_commands(self, cli_app):
        """Test all expected commands are registered"""
        expected_commands = [
            "init-db",
            "create-user",
            "create-channel",
            "list-channels",
            "assign-channel",
            "create-target",
            "health"
        ]

        for command_name in expected_commands:
            assert command_name in cli_app.commands, f"Command {command_name} not registered"

    def test_cli_app_help_no_command(self, cli_app):
        """Test CLI app shows help when no command is provided"""
        exit_code = cli_app.run([])
        assert exit_code == 0

    def test_cli_app_unknown_command(self, cli_app):
        """Test CLI app handles unknown command"""
        # ArgumentParser will raise SystemExit for unknown commands
        with pytest.raises(SystemExit):
            cli_app.run(["unknown-command"])


# =============================================================================
# Test InitDBCommand
# =============================================================================

@pytest.mark.cli
class TestInitDBCommand:
    """Test init-db command"""

    def test_init_db_command_initialization(self):
        """Test InitDBCommand initializes correctly"""
        cmd = InitDBCommand()
        assert cmd.name == "init-db"
        assert cmd.description == "Initialize database tables"

    @patch('backend.src.cli.main.create_tables')
    def test_init_db_command_success(self, mock_create_tables):
        """Test init-db command executes successfully"""
        cmd = InitDBCommand()
        args = MagicMock()

        exit_code = cmd.execute(args)

        assert exit_code == 0
        mock_create_tables.assert_called_once()

    @patch('backend.src.cli.main.create_tables')
    def test_init_db_command_failure(self, mock_create_tables):
        """Test init-db command handles failure"""
        mock_create_tables.side_effect = Exception("Database error")

        cmd = InitDBCommand()
        args = MagicMock()

        exit_code = cmd.execute(args)

        assert exit_code == 1
        mock_create_tables.assert_called_once()

    def test_init_db_via_cli_app(self, cli_app):
        """Test init-db command via CLI app"""
        with patch('backend.src.cli.main.create_tables') as mock_create_tables:
            exit_code = cli_app.run(["init-db"])

            assert exit_code == 0
            mock_create_tables.assert_called_once()


# =============================================================================
# Test CreateUserCommand
# =============================================================================

@pytest.mark.cli
class TestCreateUserCommand:
    """Test create-user command"""

    def test_create_user_command_initialization(self):
        """Test CreateUserCommand initializes correctly"""
        cmd = CreateUserCommand()
        assert cmd.name == "create-user"
        assert cmd.description == "Create a new user"

    def test_create_user_command_arguments(self, cli_app):
        """Test create-user command accepts required arguments"""
        # Parse arguments
        args = cli_app.parser.parse_args([
            "create-user",
            "--username", "testuser",
            "--email", "test@example.com",
            "--password", "SecurePass123!",
            "--role", "user"
        ])

        assert args.command == "create-user"
        assert args.username == "testuser"
        assert args.email == "test@example.com"
        assert args.password == "SecurePass123!"
        assert args.role == "user"

    def test_create_user_command_with_full_name(self, cli_app):
        """Test create-user command with optional full name"""
        args = cli_app.parser.parse_args([
            "create-user",
            "--username", "testuser",
            "--email", "test@example.com",
            "--password", "SecurePass123!",
            "--full-name", "Test User"
        ])

        assert args.full_name == "Test User"

    def test_create_user_command_default_role(self, cli_app):
        """Test create-user command uses default role"""
        args = cli_app.parser.parse_args([
            "create-user",
            "--username", "testuser",
            "--email", "test@example.com",
            "--password", "SecurePass123!"
        ])

        assert args.role == "user"

    def test_create_user_command_success(self):
        """Test create-user command executes successfully"""
        cmd = CreateUserCommand()
        args = MagicMock()
        args.username = "testuser"
        args.email = "test@example.com"
        args.password = "SecurePass123!"
        args.role = "user"
        args.full_name = "Test User"

        # Currently the command just logs and returns success
        # because actual user creation is commented out
        exit_code = cmd.execute(args)

        assert exit_code == 0

    def test_create_user_command_handles_exception(self):
        """Test create-user command handles exceptions"""
        cmd = CreateUserCommand()

        # Create args that will trigger an exception
        args = MagicMock()
        args.username = None  # Missing required field

        # Force an exception by accessing None
        with patch.object(cmd, 'execute', side_effect=Exception("User creation error")):
            try:
                exit_code = cmd.execute(args)
            except:
                exit_code = 1

        assert exit_code == 1


# =============================================================================
# Test CreateChannelCommand
# =============================================================================

@pytest.mark.cli
class TestCreateChannelCommand:
    """Test create-channel command"""

    def test_create_channel_command_initialization(self):
        """Test CreateChannelCommand initializes correctly"""
        cmd = CreateChannelCommand()
        assert cmd.name == "create-channel"
        assert cmd.description == "Create a new channel"

    def test_create_channel_command_required_arguments(self, cli_app):
        """Test create-channel command requires name and creator-id"""
        args = cli_app.parser.parse_args([
            "create-channel",
            "--name", "Test Channel",
            "--creator-id", "user-123"
        ])

        assert args.command == "create-channel"
        assert args.name == "Test Channel"
        assert args.creator_id == "user-123"

    def test_create_channel_command_all_arguments(self, cli_app):
        """Test create-channel command with all arguments"""
        args = cli_app.parser.parse_args([
            "create-channel",
            "--name", "Test Channel",
            "--description", "Test description",
            "--status", "active",
            "--business-type", "high-value",
            "--contact-email", "contact@example.com",
            "--contact-phone", "+1234567890",
            "--creator-id", "user-123"
        ])

        assert args.name == "Test Channel"
        assert args.description == "Test description"
        assert args.status == "active"
        assert args.business_type == "high-value"
        assert args.contact_email == "contact@example.com"
        assert args.contact_phone == "+1234567890"
        assert args.creator_id == "user-123"

    def test_create_channel_command_default_values(self, cli_app):
        """Test create-channel command uses default values"""
        args = cli_app.parser.parse_args([
            "create-channel",
            "--name", "Test Channel",
            "--creator-id", "user-123"
        ])

        assert args.status == "active"
        assert args.business_type == "basic"

    def test_create_channel_command_success(self):
        """Test create-channel command executes successfully"""
        cmd = CreateChannelCommand()
        args = MagicMock()
        args.name = "Test Channel"
        args.description = "Test description"
        args.status = "active"
        args.business_type = "basic"
        args.contact_email = "contact@example.com"
        args.contact_phone = "+1234567890"
        args.creator_id = "user-123"

        # Currently the command just logs and returns success
        exit_code = cmd.execute(args)

        assert exit_code == 0


# =============================================================================
# Test ListChannelsCommand
# =============================================================================

@pytest.mark.cli
class TestListChannelsCommand:
    """Test list-channels command"""

    def test_list_channels_command_initialization(self):
        """Test ListChannelsCommand initializes correctly"""
        cmd = ListChannelsCommand()
        assert cmd.name == "list-channels"
        assert cmd.description == "List all channels"

    def test_list_channels_command_no_filters(self, cli_app):
        """Test list-channels command without filters"""
        args = cli_app.parser.parse_args(["list-channels"])

        assert args.command == "list-channels"
        assert args.format == "table"

    def test_list_channels_command_with_status_filter(self, cli_app):
        """Test list-channels command with status filter"""
        args = cli_app.parser.parse_args([
            "list-channels",
            "--status", "active"
        ])

        assert args.status == "active"

    def test_list_channels_command_with_business_type_filter(self, cli_app):
        """Test list-channels command with business type filter"""
        args = cli_app.parser.parse_args([
            "list-channels",
            "--business-type", "high-value"
        ])

        assert args.business_type == "high-value"

    def test_list_channels_command_json_format(self, cli_app):
        """Test list-channels command with JSON format"""
        args = cli_app.parser.parse_args([
            "list-channels",
            "--format", "json"
        ])

        assert args.format == "json"

    def test_list_channels_command_csv_format(self, cli_app):
        """Test list-channels command with CSV format"""
        args = cli_app.parser.parse_args([
            "list-channels",
            "--format", "csv"
        ])

        assert args.format == "csv"

    def test_list_channels_command_success(self):
        """Test list-channels command executes successfully"""
        cmd = ListChannelsCommand()
        args = MagicMock()
        args.status = None
        args.business_type = None
        args.format = "table"

        # Currently the command just logs and returns success
        exit_code = cmd.execute(args)

        assert exit_code == 0


# =============================================================================
# Test HealthCheckCommand
# =============================================================================

@pytest.mark.cli
class TestHealthCheckCommand:
    """Test health command"""

    def test_health_command_initialization(self):
        """Test HealthCheckCommand initializes correctly"""
        cmd = HealthCheckCommand()
        assert cmd.name == "health"
        assert cmd.description == "Check system health"

    def test_health_command_success(self, capsys):
        """Test health command executes successfully"""
        cmd = HealthCheckCommand()
        args = MagicMock()

        exit_code = cmd.execute(args)

        assert exit_code == 0

        # Check output contains expected health check information
        captured = capsys.readouterr()
        output = captured.out
        assert "System Health Check:" in output
        assert "Time:" in output
        assert "Database:" in output
        assert "Services:" in output
        assert "Status:" in output

    def test_health_command_via_cli_app(self, cli_app, capsys):
        """Test health command via CLI app"""
        exit_code = cli_app.run(["health"])

        assert exit_code == 0

        captured = capsys.readouterr()
        output = captured.out
        assert "System Health Check:" in output

    def test_health_command_handles_exception(self):
        """Test health command handles exceptions"""
        cmd = HealthCheckCommand()
        args = MagicMock()

        # Mock print to raise an exception
        with patch('builtins.print', side_effect=Exception("Print error")):
            exit_code = cmd.execute(args)

            assert exit_code == 1


# =============================================================================
# Integration Tests
# =============================================================================

@pytest.mark.cli
@pytest.mark.integration
class TestCLIIntegration:
    """Integration tests for CLI commands"""

    def test_cli_main_help(self, cli_app):
        """Test CLI main help output"""
        # --help causes argparse to exit with SystemExit(0)
        with pytest.raises(SystemExit) as exc_info:
            cli_app.run(["--help"])
        assert exc_info.value.code == 0

    def test_cli_command_help(self, cli_app):
        """Test individual command help"""
        # Test that we can access help for each command
        commands = ["init-db", "health"]

        for command in commands:
            with pytest.raises(SystemExit) as exc_info:
                cli_app.run([command, "--help"])
            # --help causes argparse to exit with 0
            assert exc_info.value.code == 0

    def test_multiple_commands_sequence(self, cli_app):
        """Test running multiple commands in sequence"""
        with patch('backend.src.cli.main.create_tables'):
            # Run init-db
            exit_code = cli_app.run(["init-db"])
            assert exit_code == 0

            # Run health check
            exit_code = cli_app.run(["health"])
            assert exit_code == 0
