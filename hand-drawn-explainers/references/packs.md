# Excalidraw packs (icons, people, objects, tech, diagrams)

The packs are strongest for people, everyday objects, computers and system diagrams. For anything else (cells, organs, molecules, lenses, crystals, gears, maps, historical objects), **draw it yourself** as an engine component or with `group.shape({ paths })` so it carries the parts the script talks about. A generic icon that's "close enough" teaches less than a simple, specific drawing. You can also import a subject library from libraries.excalidraw.com (see "Adding packs"); search the index first, e.g. `grep -io '"name": "[^"]*\(bio\|chem\|medic\|math\|schematic\)[^"]*"' libraries/index.json` (Biology, Medicine, Organic Chemistry Basics, Mathematical Symbols, Schematic Symbols, P&ID…). Convert one, look at its gallery, and use it only if it matches the style.

674 items from 42 MIT-licensed Excalidraw libraries, drawn natively by `SA.Sketch` (pen draw-on, colours mapped to our dark palette).
Each pack has a gallery image with item names: `assets/packs/gallery/<slug>.png` — **look at it before choosing**. Credits: `assets/packs/CREDITS.md`.

## Use
```js
requires: ['assets/packs/drwnio-storytelling.js'],
s.sketch({ pack: 'drwnio-storytelling', item: 'idea', height: 220, x: 540, y: 1390 }).drawIn(t, 1.0);
```
- `height` or `size` (width) in px; anchored at its centre.
- `tint: C.orange` → monochrome (good for markers/pins); `solid: true` keeps flat fills (logo packs default to it); `text: false` drops labels baked into an icon (e.g. 'Location' under ferminrp's pin).
- `colors: 'snap'` (default) maps Excalidraw colours like its dark mode and snaps them to `SA.C`; `'dark'` = dark-mode only; `'raw'` = untouched.
- Unnamed items are `item-N`; prefer the readable aliases listed below (set in `assets/packs/aliases.json`).

## Tier A — looks native, use freely

- **`aleksandr-hovhannisyan-clocks`** (3) — time / latency: wall clock, wristwatch, alarm  
  items: wall-clock, wristwatch, alarm-clock
- **`anna-pastushko-architecture-diagram-components`** (11) — user, users, device, server, email, slack/docker/github  
  items: slack, docker, github, vpc, private-subnet, public-subnet, user, users, device, server, email
- **`artem-anufrij-live-de-artem-s-icons`** (22) — concept icons: laptop, phone, warning, info, question, target, folder, files, flag  
  items: organisation, process, laptop, tablet, smartphone, icon, cancel, accept, server, warning, information, toggle-on, toggle-off, finish, next-step, start-step, arrow, files, folder, important, target, question
- **`dday987-common-home-network-basics`** (8) — router, camera, switch, folder, server, cloud, wifi  
  items: wireless-router, security-camera, network-switch, file-folder, server, access-point, cloud, wifi-symbol
- **`dhtoran-stick-people`** (7) — stick people (blue) talking/thinking  
  items: stick-man-standard-looking-left, stick-man-talking, stick-woman-standard, stick-woman-thinking, stick-man-thinking, stick-man-standard, stick-man-with-a-hat
- **`drwnio-drwnio`** (18) — tech logos: kubernetes, redis, postgres, nginx, github, python, json, browser  
  items: archive, database, blocks, json, kubernetes, redis, nginx, rabbitmq, chip, vault, load-balancer, code, postgres, github, server-rack, python, browser, dns
- **`drwnio-storytelling`** (16) — a person at a laptop with an emotion — idea, stressed, mind-blown, sleepy, thinking… perfect 'you' moments  
  items: gloomy, idea, annoyed, happy-music, stressed, crying, furious, in-love, raging, dizzy, sleepy, speechless, thinking, mind-blown, confused, embarrassed
- **`dwelle-network-topology-icons`** (10) — computers, servers, firewall, switch, router, client  
  items: computer-w-keyboard-3d, computer-w-keyboard-and-mouse-3d, computer-3d, vpn, firewall, server, switch, hub, router, client
- **`ei-au-computers`** (4) — rack server, desktop, laptop, tower  
  items: item-1, item-2, item-3, item-4
- **`ferminrp-awesome-icons`** (24) — UI-ish icons: search, lock, home, user(s), calendar, mail, bell, location  
  items: menu, cancel, search, delete, home, lock, time, bookmark, chart, work, calendar, payment, balance, user, users, alarm, shopping-basket, location, navigation, information, plus, notifications, email, tag
- **`finfin-flow-chart-symbols`** (15) — flowchart: process, decision, start/end, database, document  
  items: off-page-connector, connector, delay, preparation-initialization, database, or, and, input-output, predefined-process, manaual-input, multiple-document, document, decision, process, start-end
- **`gianpaima-stick-figures-collaboration`** (6) — two people: communication, presentation, conversation, ideation  
  items: communication, problem-solving, active-listening, presentation, ideation, conversation
- **`intradeus-algorithms-and-data-structures-arrays-matrices-trees`** (22) — arrays, linked lists, trees, matrices  
  items: array-10, array-numbered-10, array-20, array-numbered-20, dataset-hashing-table-5, linked-list-vertical-5, datatable-5, linked-list-horizontal-5, left-rotation, right-rotation, nil-single-black, nil-double-black, red-node-filter, black-node-filter, tree-4, tree-3, tree-2, tree-1, matrix-10x10, matrix-5x5, matrix-4x4, matrix-3x3
- **`jakubpawlina-graphs`** (12) — graph/network shapes (nodes + edges)  
  items: item-1, item-2, item-3, item-4, item-5, item-6, item-7, item-8, item-9, item-10, item-11, item-12
- **`kaligule-robots`** (7) — an AI/model as a character with moods  
  items: robot-happy, robot-cheering, robot-hands-on-hips, robot-shocked, robot-worried, robot-angry, robot-broken
- **`kwirke-some-handdrawn-signs`** (2) — big hand-drawn ✓ and ✗  
  items: cross, check
- **`mateuszbaransanok-it-icons`** (48) — IT line icons with labels: network, internet, database, server, cloud, key, settings, yes/no  
  items: document, image, folder, email, sound, video, microphone, camera, speaker, model, network, internet, user, home, pie-chart, bar-chart, firewall, cloud, database, drive, server, host, device, printer, settings, key, yes, no, event, message, timer, conditional, link, signal, error, escalation, compensation, cancel, multiple, multiple-parallel, … (+8)
- **`rochacbruno-computer-parts`** (8) — mouse, disk, RAM, CPU, keyboard, display  
  items: mouse, hard-disk, chip, cpu, headphones, keyboard, display, ram
- **`rohanp-system-design`** (24) — system design: servers, databases, cache, queue, load balancer, CDN, DNS, auth  
  items: box, application-server, multi-instance-server, server, multi-instance, storage, relational-db, object-storage, cold-storage, document-db, columnar-db, graph-db, stack-storage, key-key-value-value-cache, auth-iam, dns-www-127-0-0-1, load-balancer, message-q, pipeline, cloud, cdn, 7-archive, mobile-lorem-ipsum-dolor-sit-amet-consec, web-application-g-o-o-g-l-e
- **`slobodan-aws-serverless`** (15) — hand-drawn AWS: lambda, s3, dynamodb, api-gateway, sqs, sns…  
  items: lambda, appsync, api-gateway, item-4, dynamodb, cognito, s3, kinesis, sns, sqs, ses, item-12, cloudwatch, step-functions, amplify
- **`xxxdeveloper-system-icons`** (24) — line icons: document, filter, star, lightning, relationship, paper-plane, tree  
  items: document, zip, atlas, filter, set-up, magic-wand, collection, warn, application, lightning, file, regulator, relationship, star, bar-graph, clean-up, 3d, tree, notice, book, paper-plane, picture, standardization, line-graph
- **`youritjang-stick-figures`** (9) — people: the viewer, a user, characters (shrug/happy/sad poses)  
  items: stick-man, moustache-man, girl, guy, grandma, child, shrug, happy, sad

## Tier B — usable with care (small, busy or flat)

- **`anumithaapollo12-emojis`** (48) — emoji faces (outline set item-25+ looks best)  
  items: item-1, item-2, item-3, item-4, item-5, item-6, item-7, item-8, item-9, item-10, item-11, item-12, item-13, item-14, item-15, item-16, item-17, item-18, item-19, z-z-z, item-21, item-22, item-23, item-24, item-25, item-26, item-27, item-28, item-29, item-30, item-31, item-32, item-33, item-34, item-35, item-36, item-37, item-38, item-39, item-40, … (+8)
- **`arach-systems-design-components`** (6) —   
  items: cloud-infra-starter-kit, cloud, stream, servers, db, db-2
- **`dbssticky-data-viz`** (32) — chart thumbnails (small, busy)  
  items: bar, stacked-bar, 100-stacked-bar, grouped-bar, column, stacked-column, 100-stacked-column, grouped-column, line, line-2, area, stacked-area, 100-stacked-area, themeriver, scatter, bubble, cartiesan-heatmap, calendar-heatmap, tree-map, waterfall-item-1-item-2-item-3-item-4, dot-strip-plot, dot-multi-strip-plot, dot-multi-strip-with-jitter-plot, column-histogram, population-pyrimid, density-plot, box-whisker, violin, pie, donut, polar-area-coxcomb-the-florence-nighting, label-2-label-3-label-4-label-5-label-6-
- **`dimitrios-fkliaras-clouds`** (4) — clouds  
  items: cloud-1, cloud-2, cloud-3, cloud-4
- **`g-script-charts`** (4) — tiny chart glyphs  
  items: bar-chart, column-chart, line-chart, pie-chart
- **`husainkhambaty-aws-simple-icons`** (17) — AWS circle icons  
  items: item-1, item-2, item-3, item-4, item-5, item-6, item-7, item-8, item-9, item-10, item-11, sqs, rds, ec2-cluster, ec2, s3, lambda
- **`kvchitrapu-data-sources`** (6) —   
  items: graphql, kafka, data-sources, usb, email, ftp
- **`lipis-stars`** (12) — bursts/stars for emphasis — use sparingly  
  items: item-1, item-2, item-3, item-4, item-5, item-6, item-7, item-8, item-9, item-10, item-11, item-12
- **`m47812-office-items`** (17) — everyday objects for analogies: parcel, mail, pencil, mic, headphones, folder  
  items: parcel, mail, letter, colour-pen, pencil, screen, microphone, headphone-mic, headphone, usb-stick, cd, stamp, folder, paper-clip, eraser, disc, folder-2
- **`morgemoensch-gadgets`** (5) — phone, tablet, laptop, smartwatch  
  items: smartphone, mp3-player, 14-21, tablet, laptop
- **`niknm-systemdesignicons`** (3) —   
  items: mapreduce, servicecluster, cachelayer
- **`pgilfernandez-basic-shapes`** (32) — geometric shapes  
  items: item-1, item-2, item-3, item-4, item-5, item-6, item-7, item-8, item-9, item-10, item-11, item-12, item-13, item-14, item-15, item-16, item-17, item-18, item-19, item-20, item-21, item-22, item-23, item-24, item-25, item-26, item-27, item-28, item-29, item-30, item-31, item-32
- **`samu-x86-network-elements`** (5) —   
  items: switch, edge, load-balancer, firewall, router
- **`stojanovic-aws-serverless-icons-v2`** (24) — AWS icons with labels (flat)  
  items: lambda, appsync, apigateway, dynamodb, aurora, eventbridge, sqs, sns, s3, cloudfront, ses, cloudwatch, stepfunctions, amplify, cognito, kinesis, efs, waf, vtl-resolver, javascript-resolver, aws-codepipeline, aws-cloudtrail, amazon-route-53-53, eventbridge-pipe
- **`xxxdeveloper-icons`** (65) — file-type icons (tiny labels)  
  items: paper, documents, message, shredder, clipboard, notes, table, attachment, more, cloud, delete, zip, movie, password, search, code, share, upload, download, exe, apk, dmg, psd, sketch, ai, mp3, otf, mov, iso, flv, wav, avi, sql, xls, doc, pdf, ppt, gif, jpg, png, … (+25)
- **`youritjang-software-architecture`** (7) —   
  items: item-1, item-2, item-3, item-4, item-5, item-6, item-7

## Tier C — avoid (off-style)

- **`cengizhanparlak-code-essentials`** (2) —   
  items: long-code-block, short-code-block
- **`monty-an-adjustable-arrow-shape-that-can-be-modified-in-a-number-of-ways-to-suit-different-use-cases`** (3) —   
  items: custom-arrow-help, custom-arrow-example, custom-arrow
- **`pixelass-character-kit-1`** (2) — realistic coloured characters — off-style  
  items: spiderman, zombie
- **`pratheeshpm-basic-system-design`** (7) — whole diagrams, too small/detailed  
  items: mediaservice, notificationservice, apigateway, analytics, database, searchservice, lbwithdbnrepicas

## Adding packs

1. Find a library on https://libraries.excalidraw.com (index: `libraries/index.json`; refresh with `curl -sL https://libraries.excalidraw.com/libraries.json`). Download `https://libraries.excalidraw.com/libraries/<source>` into `libraries/raw/<slug>.excalidrawlib`.
2. Convert: `node tools/excalidraw-lib.mjs libraries/raw` → `assets/packs/<slug>.js` + `catalog.json`.
3. Render its gallery and look: `node render.mjs pack-gallery --param pack=<slug> --still 3.5 --out assets/packs/gallery/<slug>.png`.
4. Name unnamed items in `assets/packs/aliases.json`, add a tier/use/defaults entry in `assets/packs/meta.json`, re-run step 2. Add the author to `CREDITS.md`.

## Making your own icons
- Draw in excalidraw.com (or the Obsidian plugin): keep strokes simple, roughness 1, stroke width 2, few colours (they get snapped to the palette anyway), text only if it is part of the icon. Select the shapes → "Add to library" → library menu → "Export" → `.excalidrawlib`. Then follow "Adding packs".
- Tiny one-off icon: add SVG path strings in a 64×64 box to `SA.ICONS` and use `s.icon(name, {size})`.
- Check: render the gallery; strokes must read at the size you will use (≥ 80 px tall on a reel), nothing tiny or text-heavy, consistent stroke weight with the rest of the scene.
