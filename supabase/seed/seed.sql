-- ============================================================
-- QuietStay Ops — Données de test (Seed)
-- ============================================================

-- Propriétaires
INSERT INTO public.owners (id, name, email, phone, company, iban) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Jean-Pierre Muller', 'jp.muller@example.ch', '+41 79 123 45 67', 'Muller Immobilier SA', 'CH93 0076 2011 6238 5295 7'),
  ('a1000000-0000-0000-0000-000000000002', 'Marie Favre', 'marie.favre@example.ch', '+41 78 234 56 78', NULL, 'CH56 0483 5012 3456 7800 9'),
  ('a1000000-0000-0000-0000-000000000003', 'Luca Bernasconi', 'luca.b@example.ch', '+41 76 345 67 89', 'LB Properties', 'CH21 0900 0000 1234 5678 9');

-- Logements
INSERT INTO public.properties (id, owner_id, name, address, city, canton, postal_code, property_type, bedrooms, max_guests, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Studio Pâquis', 'Rue de Berne 12', 'Genève', 'GE', '1201', 'studio', 0, 2, 'active'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Appart Eaux-Vives', 'Rue du Lac 45', 'Genève', 'GE', '1207', 'apartment', 2, 4, 'active'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'Chalet Verbier', 'Route de Verbier 8', 'Verbier', 'VS', '1936', 'chalet', 3, 6, 'active'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'Studio Montreux', 'Grand-Rue 22', 'Montreux', 'VD', '1820', 'studio', 0, 2, 'active'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003', 'Villa Lugano', 'Via Nassa 15', 'Lugano', 'TI', '6900', 'villa', 4, 8, 'maintenance'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000003', 'Appart Lausanne', 'Av. de la Gare 10', 'Lausanne', 'VD', '1003', 'apartment', 1, 3, 'active');

-- Réservations (dates autour de "maintenant")
INSERT INTO public.bookings (id, property_id, platform, check_in, check_out, guest_name, guest_email, guest_phone, guest_count, total_amount, commission_rate, status) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'airbnb', CURRENT_DATE - 3, CURRENT_DATE, 'Anna Schmidt', 'anna@example.de', '+49 170 1234567', 2, 450.00, 20.00, 'checked_in'),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'booking', CURRENT_DATE, CURRENT_DATE + 4, 'Thomas Dupont', 'thomas@example.fr', '+33 6 12345678', 3, 880.00, 18.00, 'confirmed'),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'direct', CURRENT_DATE + 1, CURRENT_DATE + 7, 'James Wilson', 'james@example.com', '+44 7911 123456', 5, 2100.00, 20.00, 'confirmed'),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'airbnb', CURRENT_DATE - 1, CURRENT_DATE + 2, 'Sophie Martin', 'sophie@example.ch', '+41 79 987 65 43', 1, 320.00, 20.00, 'checked_in'),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'booking', CURRENT_DATE + 1, CURRENT_DATE + 5, 'Marco Rossi', 'marco@example.it', '+39 333 1234567', 2, 600.00, 18.00, 'confirmed'),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'airbnb', CURRENT_DATE + 2, CURRENT_DATE + 5, 'Elena Petrova', 'elena@example.ru', '+7 916 1234567', 2, 540.00, 20.00, 'pending'),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', 'direct', CURRENT_DATE - 7, CURRENT_DATE - 2, 'Hans Weber', 'hans@example.de', '+49 171 9876543', 4, 1100.00, 20.00, 'checked_out'),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 'booking', CURRENT_DATE - 10, CURRENT_DATE - 3, 'Claire Blanc', 'claire@example.fr', '+33 6 98765432', 6, 2800.00, 18.00, 'checked_out');

-- Ménages
INSERT INTO public.cleanings (id, booking_id, property_id, scheduled_date, status, type, notes) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', CURRENT_DATE, 'pending', 'checkout', 'Vérifier draps et serviettes'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', CURRENT_DATE, 'in_progress', 'checkin', 'Préparer kit bienvenue'),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', CURRENT_DATE + 2, 'pending', 'checkout', NULL),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000002', CURRENT_DATE - 2, 'validated', 'checkout', 'Ménage complet effectué'),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', CURRENT_DATE - 3, 'done', 'checkout', 'Photos à valider');

-- Accès
INSERT INTO public.accesses (id, property_id, type, label, value, instructions, is_active) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'code', 'Porte immeuble', '4589#', 'Taper le code puis appuyer sur la clé', TRUE),
  ('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'lockbox', 'Boîte à clés', '7723', 'Boîtier noir à droite de la porte', TRUE),
  ('e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'smartlock', 'Serrure connectée', 'Code temporaire généré', 'Envoyer le code 24h avant arrivée', TRUE),
  ('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'key', 'Clé physique', 'Trousseau #12', 'Récupérer au bureau de la réception', TRUE),
  ('e1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000004', 'code', 'Entrée', '1234#', NULL, TRUE),
  ('e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'lockbox', 'Boîte à clés', '9901', 'Côté gauche du hall', TRUE);

-- Factures
INSERT INTO public.invoices (id, owner_id, period_start, period_end, total_revenue, commission_amount, cleaning_costs, net_amount, status) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', '2025-12-01', '2025-12-31', 3200.00, 640.00, 240.00, 2320.00, 'paid'),
  ('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', '2025-12-01', '2025-12-31', 4800.00, 960.00, 360.00, 3480.00, 'sent'),
  ('f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', '2025-12-01', '2025-12-31', 1800.00, 360.00, 180.00, 1260.00, 'draft'),
  ('f1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', '2026-01-01', '2026-01-31', 2950.00, 590.00, 200.00, 2160.00, 'draft');
