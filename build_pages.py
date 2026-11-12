#!/usr/bin/env python3
"""Génère les pages intérieures de l'AFEL (smop.html, actions.html, ...) à partir du gabarit pages.html.

Chaque page reçoit son propre <head> statique (titre, description, adresse canonique, aperçu de
partage), lisible par Google et par les aperçus WhatsApp/Facebook qui n'exécutent pas le JavaScript.
Le contenu reste celui de pages.html : on ne modifie que pages.html, puis on relance ce script.
Le déploiement (GitHub Actions) le relance automatiquement avant chaque envoi.
"""
import html, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent
SITE = 'https://afel.cm'
OG = SITE + '/assets/og-afel.jpg'

PAGES = {
    'smop': ('Comprendre le SMOP (ex-SOPK) | AFEL Yaoundé',
             "Le SMOP, nouveau nom du SOPK : définition, signes possibles, quand consulter et comment vivre avec. Des repères clairs par l'AFEL, à Yaoundé."),
    'actions': ('Nos actions | AFEL, Association Femme en Lumière',
                "Sensibiliser, informer, écouter et accompagner : les quatre engagements de l'AFEL au service des femmes atteintes du SMOP (SOPK) au Cameroun."),
    'temoignages': ('Témoignages de femmes atteintes du SMOP | AFEL',
                    "Elles parlent, on les écoute : des femmes partagent leur parcours avec le SMOP, nouveau nom du SOPK. Une parole libre, recueillie par l'AFEL."),
    'association': ('L’association | AFEL, Association Femme en Lumière',
                    "Découvrez l'Association Femme en Lumière (AFEL), basée à Yaoundé : sa mission auprès des femmes atteintes du SMOP, sa présidente et son bureau."),
    'engager': ('S’engager avec l’AFEL | Association Femme en Lumière',
                "Il existe six façons de faire partie de l'AFEL, à Yaoundé. Choisissez celle qui vous ressemble et rejoignez le mouvement qui brise le silence sur le SMOP."),
    'partenaire': ('Devenir partenaire de l’AFEL | Association Femme en Lumière',
                   "Entreprises, institutions, professionnels de santé : soutenez l'AFEL et aidez à faire sortir le SMOP (ex-SOPK) de l'ombre au Cameroun."),
    'don': ('Faire un don à l’AFEL | Association Femme en Lumière',
            "Votre don finance les actions de sensibilisation, les espaces d'écoute et l'orientation des femmes atteintes du SMOP vers un suivi adapté."),
    'contact': ('Contact | AFEL, Association Femme en Lumière, Yaoundé',
                "Contactez l'AFEL à Yaoundé IV (Messamendongo, Cité de la Paix) : +237 658 595 657 par appel ou WhatsApp, ou par e-mail à contact@afel.cm."),
}

def seo_head(url, title, desc):
    e = lambda x: html.escape(x, quote=True)
    return '\n'.join([
        f'<title>{e(title)}</title>',
        f'<meta name="description" content="{e(desc)}">',
        f'<link rel="canonical" href="{url}">',
        '<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">',
        '<link rel="icon" type="image/png" sizes="192x192" href="assets/favicon-192.png">',
        '<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">',
        '<meta name="theme-color" content="#283D5C">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="AFEL, Association Femme en Lumière">',
        '<meta property="og:locale" content="fr_FR">',
        f'<meta property="og:title" content="{e(title)}">',
        f'<meta property="og:description" content="{e(desc)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{OG}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
    ])

def main():
    src = (ROOT / 'pages.html').read_text(encoding='utf-8')
    assert '<meta name="robots" content="noindex, nofollow">' in src
    for key, (title, desc) in PAGES.items():
        out = src.replace('<html>', '<html lang="fr">', 1)
        out = out.replace('<meta name="robots" content="noindex, nofollow">',
                          seo_head(f'{SITE}/{key}.html', title, desc), 1)
        out = out.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Fichier généré par build_pages.py depuis pages.html : ne pas modifier à la main. -->', 1)
        (ROOT / f'{key}.html').write_text(out, encoding='utf-8')
    urls = [SITE + '/'] + [f'{SITE}/{k}.html' for k in PAGES] + [SITE + '/adherer.html', SITE + '/carte-vip-premium.html']
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sm += [f'  <url><loc>{u}</loc></url>' for u in urls] + ['</urlset>', '']
    (ROOT / 'sitemap.xml').write_text('\n'.join(sm), encoding='utf-8')
    print(f'{len(PAGES)} pages et sitemap.xml ({len(urls)} adresses) générés')

if __name__ == '__main__':
    main()
