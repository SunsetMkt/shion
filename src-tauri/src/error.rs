use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Zip(#[from] zip::result::ZipError),

    #[error(transparent)]
    ParseChangelog(#[from] parse_changelog::Error),

    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),

    #[error(transparent)]
    Std(#[from] Box<dyn std::error::Error>),

    #[error(transparent)]
    Tauri(#[from] tauri::Error),

    #[error(transparent)]
    Reqwest(#[from] reqwest::Error),

    #[error(transparent)]
    Sql(#[from] tauri_plugin_shion_sql::Error),

    #[error(transparent)]
    SystemTime(#[from] std::time::SystemTimeError),

    #[error(transparent)]
    GrepRegex(#[from] grep::regex::Error),

    #[error(transparent)]
    GrepMatcher(#[from] grep::matcher::NoError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
