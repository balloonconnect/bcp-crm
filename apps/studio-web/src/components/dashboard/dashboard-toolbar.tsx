"use client";

import Link from "next/link";
import { Settings2, Check, Users, FileEdit, Contact, Package, FileText, CalendarCheck, CalendarDays, ListChecks, Workflow, UsersRound, Camera, Receipt, Building2, Wallet, ReceiptText, MessageCircle, Mail, BellRing, Images, BookOpenCheck, FileSignature, ShoppingBag, ShoppingCart, Sparkles, Megaphone, Zap, BarChart3, Database, Activity } from "lucide-react";
import { Button } from "@bcp/ui";
import { NotificationBell } from "../notifications/notification-bell";
import { SearchTriggerButton } from "../search/search-trigger-button";
import { TourTriggerButton } from "../tour/tour-trigger-button";
import { useDashboard } from "../../lib/dashboard-context";

export function DashboardToolbar() {
  const { customizing, setCustomizing } = useDashboard();

  return (
    <div className="flex items-center justify-between">
      <h1 className="font-display text-2xl">Dashboard</h1>
      <div className="flex items-center gap-2">
        <SearchTriggerButton />
        <TourTriggerButton />
        <NotificationBell />
        <Button asChild variant="outline" size="sm">
          <Link href="/leads">
            <Users className="mr-2 h-4 w-4" aria-hidden="true" />
            Leads
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/data-tools">
            <Database className="mr-2 h-4 w-4" aria-hidden="true" />
            Data Tools
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/jobs">
            <Activity className="mr-2 h-4 w-4" aria-hidden="true" />
            Jobs
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/reports">
            <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
            Reports
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/automation">
            <Zap className="mr-2 h-4 w-4" aria-hidden="true" />
            Automation
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/marketing">
            <Megaphone className="mr-2 h-4 w-4" aria-hidden="true" />
            Marketing
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/copilot">
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Copilot
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/products">
            <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
            Products
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/commerce-orders">
            <ShoppingCart className="mr-2 h-4 w-4" aria-hidden="true" />
            Orders
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/contracts">
            <FileSignature className="mr-2 h-4 w-4" aria-hidden="true" />
            Contracts
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/albums">
            <BookOpenCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Albums
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/galleries">
            <Images className="mr-2 h-4 w-4" aria-hidden="true" />
            Galleries
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/email">
            <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
            Email
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/notifications">
            <BellRing className="mr-2 h-4 w-4" aria-hidden="true" />
            Preferences
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/whatsapp">
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            WhatsApp
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/invoices">
            <ReceiptText className="mr-2 h-4 w-4" aria-hidden="true" />
            Invoices
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/finance">
            <Wallet className="mr-2 h-4 w-4" aria-hidden="true" />
            Finance
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/expenses">
            <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
            Expenses
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/vendors">
            <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Vendors
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/equipment">
            <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
            Equipment
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/team">
            <UsersRound className="mr-2 h-4 w-4" aria-hidden="true" />
            Team
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/tasks">
            <ListChecks className="mr-2 h-4 w-4" aria-hidden="true" />
            Tasks
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/workflows">
            <Workflow className="mr-2 h-4 w-4" aria-hidden="true" />
            Workflows
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/events">
            <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
            Events
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/bookings">
            <CalendarCheck className="mr-2 h-4 w-4" aria-hidden="true" />
            Bookings
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/quotations">
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Quotations
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/packages">
            <Package className="mr-2 h-4 w-4" aria-hidden="true" />
            Packages
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/clients">
            <Contact className="mr-2 h-4 w-4" aria-hidden="true" />
            Clients
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/enquiry-forms">
            <FileEdit className="mr-2 h-4 w-4" aria-hidden="true" />
            Enquiry forms
          </Link>
        </Button>
        <Button type="button" variant={customizing ? "default" : "outline"} size="sm" onClick={() => setCustomizing(!customizing)}>
          {customizing ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />}
          {customizing ? "Done customizing" : "Customize"}
        </Button>
      </div>
    </div>
  );
}
