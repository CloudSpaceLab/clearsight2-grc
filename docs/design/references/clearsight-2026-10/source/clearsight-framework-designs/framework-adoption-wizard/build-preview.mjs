// Produce a portable preview that works without file:// module imports.
import {readFile,writeFile} from 'node:fs/promises'
const read=name=>readFile(new URL(name,import.meta.url),'utf8')
const [template,reference,styles,shell,isoModel,model,isoWizard,wizard]=await Promise.all(['index.source.html','reference.css','wizard.css','reference-shell.js','iso-model.js','model.js','iso-wizard.js','wizard.js'].map(read))
const cssMarker='<link rel="stylesheet" href="reference.css"><link rel="stylesheet" href="wizard.css">'
const jsMarker='<script src="reference-shell.js"></script><script type="module" src="wizard.source.js"></script>'
if(!template.includes(cssMarker)||!template.includes(jsMarker))throw Error('Preview template asset markers changed. Update the bundler before publishing the HTML.')
const localModel=[isoModel,model].join('\n').replace(/^import .*\r?\n/gm,'').replace(/^export /gm,'')
const localWizard=[isoWizard,wizard].join('\n').replace(/^import .*\r?\n/gm,'')
const html=template.replace(cssMarker,`<style>\n${reference}\n${styles}\n</style>`).replace(jsMarker,`<script>\n${shell}\n(()=>{\n${localModel}\n${localWizard}\n})();\n</script>`)
await writeFile(new URL('index.html',import.meta.url),html)
console.log('Built standalone index.html; no server or module imports are needed.')
