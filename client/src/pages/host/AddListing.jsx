import React from "react";
import ListingWizard from "../../components/host/ListingWizard";
import "./AddListingPremium.css";

export default function AddListing() {
  return (
    <div className="premium-host-add-property">
      <ListingWizard mode="create" />
    </div>
  );
}