import { useEffect, useRef, useState } from 'react'
import api from '../shared/api.js'
import { refreshAccount, useAccount } from '../shared/account.js'
import { Access, Frame, HistoryFields, Notice, nullableNumber } from './Shared.jsx'

const emptyCourse = () => ({ code:'', title:'', institution:'', term:'', status:'unspecified', record_type:'coursework', resource_id:null, activity_id:null, school_year:null, history_confirmed:false, visible:false })
const statuses = { unspecified:'Not specified', planned:'Planned', in_progress:'In progress', taken:'Taken', completed:'Completed' }
const recordTypes = { coursework:'Coursework', transfer_credit:'Transfer credit', exam_credit:'Exam credit' }
const label = course => [course.code, course.title].filter(Boolean).join(' - ') || 'Unnamed course'

function CourseFields({ form, setForm, resources }) {
  const field = (name, value) => setForm({ ...form, [name]:value })
  return <>
    <div className="connected-grid">
      <label>Course code<input maxLength={30} placeholder="CS 1331" value={form.code} onChange={e=>field('code',e.target.value)}/></label>
      <label>Course title<input maxLength={200} required={!form.code.trim()} value={form.title} onChange={e=>field('title',e.target.value)}/></label>
      <label>Institution<input maxLength={200} placeholder="Georgia Institute of Technology" value={form.institution} onChange={e=>field('institution',e.target.value)}/></label>
      <label>Term<input maxLength={50} placeholder="Fall 2024" value={form.term} onChange={e=>field('term',e.target.value)}/></label>
      <label>Course status<select value={form.status} onChange={e=>field('status',e.target.value)}>{Object.entries(statuses).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
      <label>Credit type<select value={form.record_type} onChange={e=>field('record_type',e.target.value)}>{Object.entries(recordTypes).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>
    </div>
    <label>Campus catalog match (optional)<select value={form.resource_id ?? ''} onChange={e=>field('resource_id',nullableNumber(e.target.value))}>
      <option value="">No catalog selection</option>
      {form.resource_id&&!resources.some(r=>r.id===form.resource_id)&&<option value={form.resource_id}>Current catalog match</option>}
      {resources.map(resource=><option key={resource.id} value={resource.id}>{resource.name}</option>)}
    </select><small>Choose only the matching course. You can save courses from other institutions without a campus catalog match.</small></label>
  </>
}

function CoursesContent() {
  const { me } = useAccount()
  const [collection,setCollection] = useState(null), [resources,setResources] = useState([]), [pending,setPending] = useState([])
  const [editor,setEditor] = useState(null), [editorVersion,setEditorVersion] = useState(null)
  const [draft,setDraft] = useState(null), [rows,setRows] = useState([])
  const [file,setFile] = useState(null), [pasted,setPasted] = useState(''), [search,setSearch] = useState('')
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [error,setError] = useState(''), [notice,setNotice] = useState('')
  const mounted = useRef(false), loadId = useRef(0), fileInput = useRef(null)

  const load = async () => {
    const id = ++loadId.current
    setLoading(true); setError('')
    try {
      const [courses,options,drafts] = await Promise.all([api.courses(),api.request('/profile-options'),api.request('/transcripts')])
      if (!mounted.current || id !== loadId.current) return
      setCollection(courses); setResources(options.resources.filter(r=>r.kind==='Course')); setPending(drafts.items)
    } catch (e) { if (mounted.current && id === loadId.current) setError(e.message) }
    finally { if (mounted.current && id === loadId.current) setLoading(false) }
  }
  useEffect(()=>{ mounted.current=true; load(); return ()=>{mounted.current=false;loadId.current++} },[me.person_id])

  const perform = async action => {
    setBusy(true); setError(''); setNotice('')
    try { await action() }
    catch (e) { if(mounted.current) setError(e.message) }
    finally { if(mounted.current) setBusy(false) }
  }
  const updateCollection = async (next,message) => {
    if(!mounted.current) return
    setCollection(next); setNotice(message)
    // A course write has its own revision; refresh the account's cached revision too.
    await refreshAccount()
  }
  const saveCourse = e => {
    e.preventDefault()
    perform(async()=>{
      const next = await api.saveCourse(editor.id,editorVersion,{...editor,school_year:nullableNumber(editor.school_year)})
      if(!mounted.current) return
      setEditor(null)
      await updateCollection(next,'Course saved. Review My history to see whether it is eligible for your path.')
    })
  }
  const removeCourse = course => {
    if(!window.confirm('Remove '+label(course)+' and its path-history contribution?')) return
    perform(async()=>{const next=await api.deleteCourse(course.id,collection.version);await updateCollection(next,'Course removed.')})
  }
  const showDraft = result => {
    setDraft(result)
    setRows(result.candidates.map(candidate=>({...candidate,selected:true,confirm_separate:false,course:{...emptyCourse(),...candidate.course}})))
  }
  const openDraft = id => perform(async()=>{
    if(draft && draft.id!==id && !window.confirm('Open another draft? Unsaved review edits on this page will be lost.')) return
    const result=await api.transcript(id)
    if(mounted.current) showDraft(result)
  })
  const parse = (e,kind) => {
    e.preventDefault()
    perform(async()=>{
      if(draft && !window.confirm('Parse another transcript? The current draft stays saved, but unsaved review edits on this page will be lost.')) return
      if(kind==='file' && (!file || file.size>5*1024*1024)) throw new Error('Choose a PDF no larger than 5 MB.')
      const created=await (kind==='file'?api.transcriptFile(file):api.transcriptText(pasted))
      if(!mounted.current) return
      setPending(previous=>[...previous.filter(item=>item.id!==created.id),{id:created.id,expires_at:created.expires_at}])
      setPasted(''); setFile(null)
      if(fileInput.current) fileInput.current.value=''
      const result=await api.transcript(created.id)
      if(mounted.current) {showDraft(result);setNotice('Review each course against your transcript before importing. No courses have been added yet.')}
    })
  }
  const discard = id => {
    if(!window.confirm('Discard this transcript draft and any unsaved review edits? Your saved courses stay in place.')) return
    perform(async()=>{
      await api.discardTranscript(id)
      if(!mounted.current) return
      setPending(previous=>previous.filter(item=>item.id!==id))
      if(draft?.id===id) {setDraft(null);setRows([])}
      setNotice('Transcript draft discarded.')
    })
  }
  const importSelected = e => {
    e.preventDefault()
    perform(async()=>{
      const selections=rows.filter(row=>row.selected).map(row=>({id:row.id,course:{...row.course,visible:false},confirm_separate:row.confirm_separate}))
      if(!selections.length) throw new Error('Select at least one course to import.')
      const next=await api.importTranscript(draft.id,collection.version,selections)
      if(!mounted.current) return
      setPending(previous=>previous.filter(item=>item.id!==draft.id));setDraft(null);setRows([])
      await updateCollection(next,'Imported '+(selections.length-(next.duplicates_skipped||0))+' courses as private entries. '+(next.duplicates_skipped||0)+' exact duplicates skipped. Open My history to confirm participation, timing and sharing.')
    })
  }
  const changeRow = (id,changes) => setRows(previous=>previous.map(row=>row.id===id?{...row,...changes}:row))
  const filtered = collection?.items.filter(course=>[course.code,course.title,course.institution,course.term].join(' ').toLowerCase().includes(search.toLowerCase())) || []
  const selectedCount = rows.filter(row=>row.selected).length
  const locked = busy || loading

  return <>
    <Notice error={error} notice={notice}/>
    <div className="connected-row"><a className="pill" href="#/history">Review path history</a><button className="pill" disabled={locked} onClick={load}>Reload courses</button></div>
    <p className="quiet">Courses are saved separately from your general profile. Grades and GPA are not stored. Alumni path counts use shared, confirmed participation from public alumni profiles; course listings alone do not establish attendance or an outcome.</p>
    {loading&&<p role="status">Loading courses...</p>}
    {collection&&<>
      <section>
        <div className="connected-row"><h2>Your courses ({collection.total})</h2><button className="pill hot" disabled={locked||!!editor} onClick={()=>{setEditor(emptyCourse());setEditorVersion(collection.version)}}>Add course</button></div>
        {editor&&<form className="connected-card connected-form" onSubmit={saveCourse}>
          <h3>{editor.id?'Edit course':'New course'}</h3>
          <CourseFields form={editor} setForm={setEditor} resources={resources}/>
          <HistoryFields form={editor} setForm={setEditor}/>
          <small>Sharing also requires a public profile. Planned courses and credit without confirmed participation do not count as alumni path history.</small>
          {editorVersion!==collection.version&&<p role="alert">Your course list changed while this editor was open. Cancel and reopen this course before saving so you can review the latest version.</p>}
          <div className="connected-row"><button className="pill hot" disabled={locked||editorVersion!==collection.version}>Save course</button><button type="button" className="pill" disabled={busy} onClick={()=>setEditor(null)}>Cancel</button></div>
        </form>}
        <div className="connected-form"><label>Find a saved course<input type="search" value={search} placeholder="Course, institution or term" onChange={e=>setSearch(e.target.value)}/></label></div>
        {!filtered.length&&<p>{collection.total?'No courses match your search.':'No courses saved yet. Add a course or import a transcript below.'}</p>}
        <div className="connected-grid">{filtered.map(course=><article key={course.id} className="connected-card">
          <h3>{label(course)}</h3><p>{course.institution||'Institution not specified'} / {course.term||'Term not specified'}</p>
          <p>{statuses[course.status]} / {recordTypes[course.record_type]} / {course.visible?'Shared entry':'Private entry'}</p>
          <p className="quiet">{course.history_confirmed?'Participation confirmed':'History review needed'}{course.school_year?' / School year '+course.school_year:''}</p>
          <div className="connected-row"><button className="pill" disabled={locked||!!editor} onClick={()=>{setEditor({...emptyCourse(),...course});setEditorVersion(collection.version)}}>Edit {course.code||'course'}</button><button className="pill" disabled={locked||!!editor} onClick={()=>removeCourse(course)}>Remove {course.code||'course'}</button></div>
        </article>)}</div>
      </section>
      <section>
        <h2>Import a transcript</h2>
        <p>Upload a text-based PDF or paste transcript text. Review the extracted rows before adding them. Imports start private; check each term, institution and credit type. Scanned PDFs may need text pasted instead.</p>
        <div className="connected-grid">
          <form className="connected-card connected-form" onSubmit={e=>parse(e,'file')}><label>Transcript PDF (up to 5 MB)<input ref={fileInput} type="file" accept="application/pdf,.pdf" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="pill" disabled={locked||!file}>Review PDF courses</button></form>
          <form className="connected-card connected-form" onSubmit={e=>parse(e,'text')}><label>Transcript text<textarea minLength={20} maxLength={50000} required value={pasted} onChange={e=>setPasted(e.target.value)}/></label><button className="pill" disabled={locked||pasted.trim().length<20}>Review pasted courses</button></form>
        </div>
        {!!pending.length&&<details className="connected-card"><summary>Saved transcript drafts ({pending.length})</summary><p>Review edits are kept in this page until import; only the original extracted draft is saved for later.</p>{pending.map(item=><div key={item.id} className="connected-row"><span>Expires {new Date(item.expires_at).toLocaleString()}</span><button className="pill" disabled={locked||draft?.id===item.id} onClick={()=>openDraft(item.id)}>Open draft</button><button className="pill" disabled={locked} onClick={()=>discard(item.id)}>Discard draft</button></div>)}</details>}
      </section>
      {draft&&<section>
        <h2>Review transcript courses</h2>
        <p>{rows.length} rows found. {selectedCount} selected. Expires {new Date(draft.expires_at).toLocaleString()}. Exact duplicates are skipped; ambiguous matches need corrected details or an explicit separate-entry confirmation.</p>
        {!!draft.warnings?.length&&<ul>{draft.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>}
        {!rows.length&&<p>No readable course rows were found. Try pasting text or add courses manually.</p>}
        <form onSubmit={importSelected}>
          <div className="connected-row"><button className="pill" type="button" disabled={locked} onClick={()=>setRows(previous=>previous.map(row=>({...row,selected:true})))}>Select all</button><button className="pill" type="button" disabled={locked} onClick={()=>setRows(previous=>previous.map(row=>({...row,selected:false})))}>Clear selection</button></div>
          {rows.map((row,index)=><article key={row.id} className="connected-card connected-form">
            <label className="check"><input type="checkbox" checked={row.selected} disabled={busy} onChange={e=>changeRow(row.id,{selected:e.target.checked})}/>Import row {index+1}: {label(row.course)}</label>
            {row.location&&<small>Source page {row.location.page}, line {row.location.line}</small>}
            {!!row.warnings?.length&&<ul>{row.warnings.map((warning,i)=><li key={i}>{warning}</li>)}</ul>}
            {row.selected&&<>
              <CourseFields form={row.course} resources={resources} setForm={course=>changeRow(row.id,{course})}/>
              {!!row.possible_duplicates?.length&&<p role="note">This row may match {row.possible_duplicates.map(id=>label(collection.items.find(course=>course.id===id)||{})).join('; ')}. Check the institution and term before importing.</p>}
              <label className="check"><input type="checkbox" checked={row.confirm_separate} onChange={e=>changeRow(row.id,{confirm_separate:e.target.checked})}/>If this is an ambiguous duplicate, I confirm it is a separate course attempt or credit record.</label>
            </>}
          </article>)}
          <div className="connected-row"><button className="pill hot" disabled={locked||!selectedCount}>{busy?'Working...':'Import '+selectedCount+' selected courses'}</button><button className="pill" type="button" disabled={locked} onClick={()=>discard(draft.id)}>Discard this draft</button></div>
        </form>
      </section>}
    </>}
  </>
}

export function CoursesPage({who}) {
  const { me,status } = useAccount()
  return <Frame title="My Courses" active="courses" who={who} intro="Keep your coursework, transfer credits and transcript imports in one place."><Access><CoursesContent key={me?.person_id||status}/></Access></Frame>
}
