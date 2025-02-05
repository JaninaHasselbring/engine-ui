import React, { useState, useContext } from "react";
import { AlertContext } from "./Alert";
import axios from "axios";
import { FileText } from "react-feather";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import DownloadLink from "./DownloadLink";
import StreamEntryView from "./StreamEntryView";
import SolveTraceEntryView from "./SolveTraceEntryView";
import TerminateJobButton from "./TerminateJobButton";
import { GAMSRcMap } from "./constants";
import { isActiveJob, getResponseError } from "./util";
import JobTimingInfoBar from "./JobTimingInfoBar";

const JobRespInfoTable = props => {
  const { job, statusCodes, server, isHcJob, setRefreshJob } = props;
  let solveTraceEntries;
  const [jobStatus, setJobStatus] = useState(job.status);
  const [queuePosition, setQueuePosition] = useState(job.queue_position);
  if (isHcJob) {
    solveTraceEntries = [];
  } else if (job.status >= 10) {
    solveTraceEntries = job.text_entries.map(el => el.entry_name).filter(v =>
      v.toLowerCase().endsWith('.solvetrace')
    );
  } else {
    solveTraceEntries = job.stream_entries.filter(v =>
      v.toLowerCase().endsWith('.solvetrace')
    );
  }
  const [streamEntry, setStreamEntry] = useState(isHcJob ? null :
    (job.stream_entries.length ? (job.stream_entries[0] ? job.stream_entries[0] : null) : job.stdout_filename));
  const [solveTraceEntry, setSolveTraceEntry] = useState(solveTraceEntries[0]);
  const [, setAlertMsg] = useContext(AlertContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemoveConfirmDialog, setShowRemoveConfirmDialog] = useState(false);
  const [textEntry, setTextEntry] = useState(isHcJob ? null : (job.text_entries[0] ? job.text_entries[0].entry_name : null));

  const deleteData = () => {
    setIsSubmitting(true);
    axios
      .delete(
        `${server}/${isHcJob ? 'hypercube' : 'jobs'}/${encodeURIComponent(job.token)}/result`
      )
      .then(() => {
        setIsSubmitting(false);
        setShowRemoveConfirmDialog(false);
        setRefreshJob(refresh => refresh + 1);
      })
      .catch(err => {
        setIsSubmitting(false);
        setShowRemoveConfirmDialog(false);
        setAlertMsg(`Problems deleting dataset. Error message: ${getResponseError(err)}`);
      });
  }

  return (
    <>
      <table className="table table-sm table-fixed">
        <thead className="thead-dark">
          <tr>
            <th colSpan="2" className="text-center">
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Status</th>
            <td>
              <span>{jobStatus in statusCodes ? statusCodes[jobStatus] : jobStatus}</span>
              <small>{jobStatus === 0 && queuePosition != null && queuePosition !== -1 ? ` (queue position: ${queuePosition})` : ''}</small>
            </td>
          </tr>
          <tr>
            <th>Timing</th>
            <td>
              {job.user.deleted ?
                <span className="badge badge-danger">
                  Timing information not available.
                </span> :
                <JobTimingInfoBar
                  token={job.token}
                  isHcJob={isHcJob}
                  jobOwner={job.user.username}
                  setRefreshJob={setRefreshJob}
                  setJobStatus={setJobStatus}
                  setQueuePosition={setQueuePosition} />}
            </td>
          </tr>
          {isHcJob ?
            <>
              <tr>
                <th>Progress</th>
                <td>{`${job.finished}/${job.job_count} (${job.successfully_finished} successful)`}</td>
              </tr>
              {isActiveJob(jobStatus) &&
                <tr>
                  <th>Terminate Job</th>
                  <td>
                    <TerminateJobButton
                      token={isHcJob ? `hc:${job.token}` : job.token}
                      setRefresh={setRefreshJob}
                      server={server}
                      status={jobStatus} />
                  </td>
                </tr>}
            </> :
            <>
              <tr>
                <th>Process Status</th>
                <td>{job.process_status != null ?
                  <span
                    className={`badge ${job.process_status === 0 ? '' : 'badge-danger'}`}>
                    {GAMSRcMap[job.process_status] != null ?
                      `${GAMSRcMap[job.process_status]} (${job.process_status})` : job.process_status}
                  </span> : "-"}</td>
              </tr>
              {jobStatus >= 10 && <tr>
                <th>Text Entries</th>
                <td>
                  {job.text_entries && job.text_entries.length > 0 ?
                    <div className="form-group form-inline">
                      <select
                        className="form-control form-control-sm"
                        name="text-entry"
                        id="text-entry"
                        value={textEntry}
                        onChange={e => setTextEntry(e.target.value)}
                      >
                        {job.text_entries.map(e => (
                          <option key={e.entry_name} value={e.entry_name}>
                            {e.entry_name}
                          </option>
                        ))}
                      </select>
                      &nbsp;
                      {textEntry &&
                        <DownloadLink
                          url={`${server}/jobs/${encodeURIComponent(job.token)}/text-entry?entry_name=${encodeURIComponent(textEntry)}`}
                          filename={textEntry}
                          jsonSubkey="entry_value">
                          <FileText size={18} />
                        </DownloadLink>
                      }
                    </div> :
                    <span className="badge badge-danger">
                      {job.result_exists ? 'No text entries.' : 'Job results were deleted.'}
                    </span>}
                </td>
              </tr>}
              {isActiveJob(jobStatus) && jobStatus !== 0 &&
                <>
                  <tr>
                    <th>Stream Entries</th>
                    <td>
                      <div className="form-group form-inline">
                        <select
                          className="form-control form-control-sm"
                          name="stream-entry"
                          id="stream-entry"
                          value={streamEntry}
                          onChange={e => setStreamEntry(e.target.value)}
                        >
                          {job.stream_entries.concat(job.stdout_filename).map(e => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                        &nbsp;
                        <StreamEntryView
                          server={server}
                          streamEntry={streamEntry}
                          setRefreshJob={setRefreshJob}
                          isStdOut={streamEntry === job.stdout_filename}
                        />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th>Terminate Job</th>
                    <td>
                      <TerminateJobButton
                        token={job.token}
                        setRefresh={setRefreshJob}
                        server={server}
                        status={jobStatus} />
                    </td>
                  </tr>
                </>
              }
              {jobStatus > 0 && solveTraceEntries.length > 0 &&
                <tr>
                  <th>Solve Trace</th>
                  <td>
                    <div className="form-group form-inline">
                      <select
                        className="form-control form-control-sm"
                        name="solve-trace"
                        id="solve-trace"
                        value={solveTraceEntry}
                        onChange={e => setSolveTraceEntry(e.target.value)}
                      >
                        {solveTraceEntries.map(e => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                    </div>
                    <SolveTraceEntryView
                      server={server}
                      solveTraceEntry={solveTraceEntry}
                      setRefreshJob={setRefreshJob}
                      jobFinished={jobStatus >= 10}
                    />
                  </td>
                </tr>
              }
            </>
          }
          {(jobStatus >= 10 || (isHcJob && jobStatus === -3)) && <tr>
            <th>Result ZIP</th>
            <td>
              {job.result_exists ?
                <>
                  <DownloadLink url={isHcJob ? `${server}/hypercube/${encodeURIComponent(job.token)}/result` :
                    `${server}/jobs/${encodeURIComponent(job.token)}/result`} filename="results.zip"
                    className="btn btn-sm btn-outline-info">
                    Download
                  </DownloadLink>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setShowRemoveConfirmDialog(true)}>
                    Delete Results
                  </button>
                </> :
                <span className="badge badge-danger">
                  Job results were deleted.
                </span>}
            </td>
          </tr>}
        </tbody>
      </table>
      <Modal show={showRemoveConfirmDialog} onHide={() => setShowRemoveConfirmDialog(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Please Confirm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove the results of the job{isHcJob ? '' : ' as well as all text entries belonging to this job'}? This cannot be undone!
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveConfirmDialog(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={deleteData} disabled={isSubmitting}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default JobRespInfoTable;
