import React, { useState, useContext, useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { AlertContext } from "./Alert";
import { AuthContext } from "../AuthContext";
import axios from "axios";
import { getResponseError } from "./util";
import SubmitButton from "./SubmitButton";
import ClipLoader from "react-spinners/ClipLoader";

const InstanceSubmissionForm = () => {
    const { label } = useParams();
    const [, setAlertMsg] = useContext(AlertContext);
    const [{ server }] = useContext(AuthContext);

    const [submissionErrorMsg, setSubmissionErrorMsg] = useState("");
    const [formErrors, setFormErrors] = useState("");
    const [errorMsg, setErrorMsg] = useState("")
    const [instanceLabel, setInstanceLabel] = useState("");
    const [cpuReq, setCpuReq] = useState("");
    const [memReq, setMemReq] = useState("");
    const [wsReq, setWsReq] = useState("");
    const [tolerations, setTolerations] = useState("");
    const [nodeSelectors, setNodeSelectors] = useState("");
    const [multiplier, setMultiplier] = useState("");
    const [multiplierIdle, setMultiplierIdle] = useState("");
    const [assignLicense, setAssignLicense] = useState(false);
    const [GAMSLicense, setGAMSLicense] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const [instanceUpdated, setInstanceUpdated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!label) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setErrorMsg("");
        axios.get(`${server}/usage/instances`)
            .then(res => {
                const instanceData = res.data.filter(el => el.label === label && el.is_pool !== true);
                if (instanceData.length > 0) {
                    setInstanceLabel(instanceData[0].label);
                    setCpuReq(instanceData[0].cpu_request);
                    setMemReq(instanceData[0].memory_request);
                    setWsReq(instanceData[0].workspace_request);
                    setMultiplier(instanceData[0].multiplier);
                    setMultiplierIdle(instanceData[0].multiplier_idle);
                    setTolerations(instanceData[0].tolerations.map(el => `${el.key}=${el.value}`).join(","));
                    setNodeSelectors(instanceData[0].node_selectors.map(el => `${el.key}=${el.value}`).join(","));
                    const gamsLicenseAssigned = instanceData[0].gams_license != null && instanceData[0].gams_license !== "";
                    setAssignLicense(gamsLicenseAssigned);
                    setGAMSLicense(gamsLicenseAssigned ? instanceData[0].gams_license.trim() : "");
                    setIsLoading(false);
                } else {
                    setErrorMsg(`Instance: ${label} does not exist`);
                    setIsLoading(false);
                }
            })
            .catch(err => {
                setErrorMsg(`Problems while while retrieving instance data. Error message: ${getResponseError(err)}.`);
                setIsLoading(false);
            });
    }, [server, label]);

    const handleInstanceSubmission = async () => {
        setFormErrors({});
        setIsSubmitting(true);
        try {
            const payload = {
                label: instanceLabel,
                cpu_request: cpuReq,
                memory_request: memReq,
                workspace_request: wsReq,
                multiplier: multiplier,
                multiplier_idle: multiplierIdle
            }
            if (label) {
                payload['old_label'] = label;
            }
            if (tolerations) {
                const tolerationsTmp = tolerations.split(',');
                if (tolerationsTmp.length) {
                    payload['tolerations'] = tolerationsTmp;
                }
            }
            if (nodeSelectors) {
                const nodeSelectorsTmp = nodeSelectors.split(',');
                if (nodeSelectorsTmp.length) {
                    payload['node_selectors'] = nodeSelectorsTmp;
                }
            }
            if (assignLicense && GAMSLicense !== "") {
                payload['gams_license'] = window.btoa(GAMSLicense.trim());
            }
            await axios({
                url: `${server}/usage/instances`,
                method: label ? "put" : "post",
                data: payload
            });
            setAlertMsg(`success:Instance ${label ? "updated" : "added"} successfully`);
            setInstanceUpdated(true);
        }
        catch (err) {
            if (err.response && err.response.data && err.response.data.errors) {
                const formErrorsTmp = {};
                ['label', 'cpu_request', 'memory_request',
                    'multiplier', 'multiplier_idle', 'workspace_request', 'tolerations',
                    'node_selectors', 'gams_license'].forEach(key => {
                        if (err.response.data.errors.hasOwnProperty(key)) {
                            formErrorsTmp[key] = err.response.data.errors[key]
                        }
                    });
                setFormErrors(formErrorsTmp);
                setSubmissionErrorMsg(`Problems ${label ? "updating" : "adding"} instance.`);
            } else {
                setSubmissionErrorMsg(`Problems ${label ? "updating" : "adding"} instance. Error message: ${getResponseError(err)}`);
            }
            setIsSubmitting(false);
        }
    }

    return (
        <div>
            <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 className="h2">{label ? `Update Instance: '${label}'` : "Add new Instance"}</h1>
            </div>
            {errorMsg ?
                <div className="invalid-feedback text-center" style={{ display: "block" }}>
                    {errorMsg}
                </div> :
                (isLoading ? <ClipLoader /> :
                    <form
                        className="m-auto"
                        onSubmit={e => {
                            e.preventDefault();
                            handleInstanceSubmission();
                            return false;
                        }}
                    >
                        <div className="invalid-feedback text-center" style={{ display: submissionErrorMsg !== "" ? "block" : "none" }}>
                            {submissionErrorMsg}
                        </div>
                        <div className="row">
                            <div className="col-md-6 col-12">
                                <fieldset disabled={isSubmitting}>
                                    <div className="form-group">
                                        <label htmlFor="instanceLabel">
                                            Instance Label
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.label ? " is-invalid" : "")}
                                            id="instanceLabel"
                                            autoComplete="on"
                                            required
                                            value={instanceLabel}
                                            onChange={e => setInstanceLabel(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.label ? formErrors.label : ""}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="cpuReq">
                                            CPU (vCPU)
                                        </label>
                                        <input
                                            type="number"
                                            className={"form-control" + (formErrors.cpu_request ? " is-invalid" : "")}
                                            step="any"
                                            id="cpuReq"
                                            min="0"
                                            value={cpuReq}
                                            required
                                            onChange={e => setCpuReq(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.cpu_request ? formErrors.cpu_request : ""}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="memReq">
                                            Memory (in MiB)
                                        </label>
                                        <input
                                            type="number"
                                            className={"form-control" + (formErrors.memory_request ? " is-invalid" : "")}
                                            id="memReq"
                                            min="0"
                                            value={memReq}
                                            required
                                            onChange={e => setMemReq(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.memory_request ? formErrors.memory_request : ""}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="wsReq">
                                            Workspace Size (MiB)
                                        </label>
                                        <input
                                            type="number"
                                            className={"form-control" + (formErrors.workspace_request ? " is-invalid" : "")}
                                            id="wsReq"
                                            step="any"
                                            min="0"
                                            value={wsReq}
                                            required
                                            onChange={e => setWsReq(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.workspace_request ? formErrors.workspace_request : ""}
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                            <div className="col-md-6 col-12">
                                <fieldset disabled={isSubmitting}>
                                    <div className="form-group">
                                        <label htmlFor="multiplier">
                                            Multiplier
                                        </label>
                                        <input
                                            type="number"
                                            className={"form-control" + (formErrors.multiplier ? " is-invalid" : "")}
                                            id="multiplier"
                                            min="0"
                                            step="any"
                                            value={multiplier}
                                            required
                                            onChange={e => setMultiplier(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.multiplier ? formErrors.multiplier : ""}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="multiplier_idle">
                                            Idle Multiplier (applied when worker in instance pool is idle)
                                        </label>
                                        <input
                                            type="number"
                                            className={"form-control" + (formErrors.multiplier_idle ? " is-invalid" : "")}
                                            id="multiplier_idle"
                                            min="0"
                                            step="any"
                                            value={multiplierIdle}
                                            required
                                            onChange={e => setMultiplierIdle(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.multiplier_idle ? formErrors.multiplier_idle : ""}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="tolerations">
                                            Tolerations (comma-separated, optional)
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.tolerations ? " is-invalid" : "")}
                                            id="tolerations"
                                            autoComplete="on"
                                            value={tolerations}
                                            onChange={e => setTolerations(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.tolerations ? formErrors.tolerations : ""}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="nodeSelectors">
                                            Node Selectors (comma-separated, optional)
                                        </label>
                                        <input
                                            type="text"
                                            className={"form-control" + (formErrors.node_selectors ? " is-invalid" : "")}
                                            id="nodeSelectors"
                                            autoComplete="on"
                                            value={nodeSelectors}
                                            onChange={e => setNodeSelectors(e.target.value)}
                                        />
                                        <div className="invalid-feedback">
                                            {formErrors.node_selectors ? formErrors.node_selectors : ""}
                                        </div>
                                    </div>
                                    <div className="form-check mb-3">
                                        <input type="checkbox" className="form-check-input"
                                            checked={assignLicense !== false} onChange={e => setAssignLicense(e.target.checked)}
                                            id="assignLicense" />
                                        <label className="form-check-label" htmlFor="assignLicense">Attach GAMS license to the instance (takes precedence over user and system-wide licenses)?</label>
                                    </div>
                                    {assignLicense && <div className="form-group">
                                        <label htmlFor="licenseBox">
                                            GAMS License
                                        </label>
                                        <textarea
                                            id="licenseBox"
                                            rows="6"
                                            cols="50"
                                            className={"form-control monospace no-resize" + (formErrors.gams_license ? " is-invalid" : "")}
                                            value={GAMSLicense}
                                            style={{ fontSize: '8pt' }}
                                            onChange={e => setGAMSLicense(e.target.value)} >
                                        </textarea>
                                        <div className="invalid-feedback">
                                            {formErrors.gams_license ? formErrors.gams_license : ""}
                                        </div>
                                    </div>
                                    }
                                </fieldset>
                            </div>
                        </div>
                        <div className="mt-3">
                            <SubmitButton isSubmitting={isSubmitting}>
                                {label ? "Update Instance" : "Add Instance"}
                            </SubmitButton>
                        </div>
                        {instanceUpdated && <Navigate to=".." />}
                    </form>
                )}
        </div>
    );
}

export default InstanceSubmissionForm;
