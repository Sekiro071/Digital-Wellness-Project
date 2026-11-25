"""Build a release from explicit public files only. Use --check before packaging."""
from __future__ import annotations

import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'output/Good_Signal_Web_App.zip'
REQUIRED = (
    'index.html', 'server.py', 'requirements.txt', 'README.md', 'DESIGN.md',
    'PROJECT_PLAN.md', 'QA_REPORT.md', 'SUBMISSION_CHECKLIST.md', 'package.json',
    'package-lock.json', '.gitignore', 'data/resources.json',
    'tests/test_server.py', 'tests/test_links.py', 'tests/frontend.test.cjs',
    'tools/check_external_links.py', 'tools/package_release.py',
    'evidence/ACCESSIBILITY_CHECKLIST.md', 'evidence/SOURCE_LINKS.md',
    'evidence/source_link_record.json', 'evidence/RESOURCE_COMPARISON.md',
    'evidence/RESOURCE_COMPARISON.csv', 'evidence/USER_TESTING_TEMPLATE.csv',
    'evidence/Final_Project_Report.md',
    'output/pdf/Digital_Wellness_Presentation_and_Submission_Guide.pdf',
    'output/pdf/Good_Signal_Project_Report.pdf',
    'output/presentation/Good_Signal_Project_Presentation_Final.pptx',
    'output/guide-reference-checks/results.json',
)
PUBLIC_DIRS = ('css', 'js', 'pages', 'guides', 'assets/guides')
# Deliberately selected visual evidence; no browser profiles, duplicate source
# image copies, temporary renders, databases, or participant submissions.
SCREENSHOTS = (
    'output/sol-theme-checks/home-1440-light.png',
    'output/sol-theme-checks/home-390-dark.png',
    'output/sol-theme-checks/explore-1440-light.png',
    'output/sol-theme-checks/explore-390-dark.png',
    'output/sol-theme-checks/focus-1440-light.png',
    'output/sol-theme-checks/focus-390-dark.png',
    'output/sol-theme-checks/compare-light.png',
    'output/sol-theme-checks/compare-dark.png',
)


def collect():
    names = set(REQUIRED + SCREENSHOTS)
    for folder in PUBLIC_DIRS:
        base = ROOT / folder
        if not base.is_dir():
            raise FileNotFoundError(f'Missing public directory: {folder}')
        for path in base.rglob('*'):
            if path.is_symlink():
                raise ValueError(f'Symlink not permitted in release: {path}')
            if path.is_file():
                names.add(path.relative_to(ROOT).as_posix())
    missing = sorted(name for name in names if not (ROOT / name).is_file())
    if missing:
        raise FileNotFoundError('Missing required release files:\n  ' + '\n  '.join(missing))
    return sorted(names)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check required files and list contents without creating an archive')
    args = parser.parse_args()
    names = collect()
    if args.check:
        print('\n'.join(names))
        print(f'Ready: {len(names)} files; no archive created.')
        return
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    temporary = TARGET.with_suffix('.zip.tmp')
    try:
        with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
            for name in names:
                archive.write(ROOT / name, name)
        with ZipFile(temporary) as archive:
            if archive.testzip() is not None or sorted(archive.namelist()) != names:
                raise RuntimeError('Archive verification failed')
        temporary.replace(TARGET)
    finally:
        temporary.unlink(missing_ok=True)
    print(f'Created and verified {TARGET} ({len(names)} files).')


if __name__ == '__main__':
    main()
