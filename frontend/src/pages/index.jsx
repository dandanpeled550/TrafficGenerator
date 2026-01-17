import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Generator from "./Generator";

import Analytics from "./Analytics";

import UserProfiles from "./UserProfiles";

import Campaigns from "./Campaigns";

import CampaignDetail from "./CampaignDetail";

import Logs from "./Logs";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Generator: Generator,
    
    Analytics: Analytics,
    
    UserProfiles: UserProfiles,
    
    Campaigns: Campaigns,
    
    Logs: Logs,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Generator" element={<Generator />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/UserProfiles" element={<UserProfiles />} />
                
                <Route path="/Campaigns" element={<Campaigns />} />
                
                <Route path="/campaign/:campaignId" element={<CampaignDetail />} />
                
                <Route path="/Logs" element={<Logs />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}