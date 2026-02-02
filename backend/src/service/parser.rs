use lazy_static::lazy_static;
use regex::Regex;

use crate::types::{ErrorSeverity, MoveError};

lazy_static! {
    // Main error pattern:
    // error[E01001]: unbound variable `foo`
    //    ┌─ sources/main.move:10:5
    static ref ERROR_PATTERN: Regex = Regex::new(
        r"error\[(?P<code>E\d+)\]: (?P<message>.+)\n\s+┌─ (?P<file>[^:]+):(?P<line>\d+):(?P<col>\d+)"
    ).unwrap();

    // Warning pattern
    static ref WARNING_PATTERN: Regex = Regex::new(
        r"warning\[(?P<code>W\d+)\]: (?P<message>.+)\n\s+┌─ (?P<file>[^:]+):(?P<line>\d+):(?P<col>\d+)"
    ).unwrap();

    // Simple error pattern (no code)
    static ref SIMPLE_ERROR_PATTERN: Regex = Regex::new(
        r"error: (?P<message>.+)\n\s+┌─ (?P<file>[^:]+):(?P<line>\d+):(?P<col>\d+)"
    ).unwrap();
}

pub struct Parser;

impl Parser {
    pub fn parse_errors(output: &str) -> Vec<MoveError> {
        let mut errors = Vec::new();

        // Parse structured errors
        for cap in ERROR_PATTERN.captures_iter(output) {
            errors.push(MoveError {
                file: cap["file"].to_string(),
                line: cap["line"].parse().unwrap_or(1),
                column: cap["col"].parse().unwrap_or(1),
                end_line: None,
                end_column: None,
                message: cap["message"].to_string(),
                severity: ErrorSeverity::Error,
                code: Some(cap["code"].to_string()),
            });
        }

        // Parse simple errors (without error code)
        for cap in SIMPLE_ERROR_PATTERN.captures_iter(output) {
            // Avoid duplicates
            let file = &cap["file"];
            let line: u32 = cap["line"].parse().unwrap_or(1);
            if errors.iter().any(|e| e.file == file && e.line == line) {
                continue;
            }

            errors.push(MoveError {
                file: file.to_string(),
                line,
                column: cap["col"].parse().unwrap_or(1),
                end_line: None,
                end_column: None,
                message: cap["message"].to_string(),
                severity: ErrorSeverity::Error,
                code: None,
            });
        }

        // Parse warnings
        for cap in WARNING_PATTERN.captures_iter(output) {
            errors.push(MoveError {
                file: cap["file"].to_string(),
                line: cap["line"].parse().unwrap_or(1),
                column: cap["col"].parse().unwrap_or(1),
                end_line: None,
                end_column: None,
                message: cap["message"].to_string(),
                severity: ErrorSeverity::Warning,
                code: Some(cap["code"].to_string()),
            });
        }

        errors
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_error() {
        let output = r#"error[E01002]: unbound variable `foo`
   ┌─ sources/main.move:10:5
   │
10 │     foo + 1
   │     ^^^
"#;
        let errors = Parser::parse_errors(output);
        assert_eq!(errors.len(), 1);
        assert_eq!(errors[0].file, "sources/main.move");
        assert_eq!(errors[0].line, 10);
        assert_eq!(errors[0].column, 5);
        assert_eq!(errors[0].message, "unbound variable `foo`");
    }
}
