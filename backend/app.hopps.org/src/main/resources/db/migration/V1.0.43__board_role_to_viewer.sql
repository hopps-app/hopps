-- The role BOARD no longer exists: the board is now ADMIN, which can also keep the books and manage members, and a
-- member who should only read is VIEWER. Nobody was given BOARD in a real organization yet, so this only keeps
-- stray rows loadable while keeping them read-only. ADMIN rows stay as they are and now mean the board.
UPDATE member_verein
SET role = 'VIEWER'
WHERE role = 'BOARD';
